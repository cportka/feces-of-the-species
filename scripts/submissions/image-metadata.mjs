// image-metadata.mjs — strip privacy-sensitive metadata from submitted images, in pure JS with
// no dependencies. The privacy-critical case is EXIF GPS in field photos, so this is the guarantee
// the approval pipeline relies on: every committed image goes through here first.
//
// Operates on Uint8Array in and out, so it runs identically under `node --test` and in an Action.

/** Identify an image by magic bytes. Returns "jpeg" | "png" | "gif" | "webp" | null. */
export function detectImageType(bytes) {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "gif";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
  return null;
}

/** True if a JPEG carries an APP1 "Exif" segment (used by tests). */
export function jpegHasExif(bytes) {
  if (detectImageType(bytes) !== "jpeg") return false;
  let i = 2;
  const n = bytes.length;
  while (i + 4 <= n) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const marker = bytes[i + 1];
    if (marker === 0xd9) break; // EOI
    if (marker === 0xda) break; // SOS — scan data follows
    if (marker === 0xff) { i++; continue; } // fill byte
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { i += 2; continue; } // RSTn/TEM
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (marker === 0xe1) {
      // APP1: Exif\0\0 or XMP
      const p = i + 4;
      if (bytes[p] === 0x45 && bytes[p + 1] === 0x78 && bytes[p + 2] === 0x69 && bytes[p + 3] === 0x66) {
        return true;
      }
    }
    i += 2 + len;
  }
  return false;
}

/**
 * Remove metadata (APP1 Exif/XMP, APP2–APP15, and COM comment) segments from a JPEG. Keeps APP0
 * (JFIF) and all structural segments (quantization/Huffman tables, frame/scan headers) so the image
 * stays valid and renders identically. Once SOS is reached the entropy-coded scan is copied whole.
 */
export function stripJpegMetadata(bytes) {
  const out = [0xff, 0xd8];
  let i = 2;
  const n = bytes.length;
  while (i < n) {
    if (bytes[i] !== 0xff) { out.push(bytes[i]); i++; continue; }
    if (i + 1 >= n) { out.push(bytes[i]); i++; continue; }
    const marker = bytes[i + 1];
    if (marker === 0xff) { out.push(0xff); i++; continue; } // fill byte
    if (marker === 0xd9) { out.push(0xff, 0xd9); i += 2; continue; } // EOI
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { out.push(0xff, marker); i += 2; continue; }
    if (marker === 0xda) { // SOS — copy the rest verbatim
      for (let k = i; k < n; k++) out.push(bytes[k]);
      break;
    }
    if (i + 4 > n) { out.push(bytes[i]); i++; continue; }
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    const segEnd = i + 2 + len;
    const strip = marker === 0xe1 || (marker >= 0xe2 && marker <= 0xef) || marker === 0xfe;
    if (!strip) {
      for (let k = i; k < segEnd && k < n; k++) out.push(bytes[k]);
    }
    i = segEnd;
  }
  return Uint8Array.from(out);
}

const PNG_STRIP_CHUNKS = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);

/** Remove ancillary metadata chunks (text/EXIF/timestamp) from a PNG; keep everything else. */
export function stripPngMetadata(bytes) {
  const n = bytes.length;
  const out = [];
  for (let k = 0; k < 8; k++) out.push(bytes[k]); // signature
  let i = 8;
  while (i + 8 <= n) {
    const len = (bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3];
    const type = String.fromCharCode(bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7]);
    const chunkEnd = i + 12 + len; // length(4) + type(4) + data(len) + crc(4)
    if (chunkEnd > n) break; // malformed — stop
    if (!PNG_STRIP_CHUNKS.has(type)) {
      for (let k = i; k < chunkEnd; k++) out.push(bytes[k]);
    }
    i = chunkEnd;
    if (type === "IEND") break;
  }
  return Uint8Array.from(out);
}

/**
 * Strip metadata from a supported image, dispatching on detected type. GIF/WebP pass through
 * unchanged (they rarely carry location data; noted rather than silently claimed clean).
 * @returns {{bytes: Uint8Array, type: string|null, stripped: boolean}}
 */
export function stripImageMetadata(bytes) {
  const type = detectImageType(bytes);
  if (type === "jpeg") return { bytes: stripJpegMetadata(bytes), type, stripped: true };
  if (type === "png") return { bytes: stripPngMetadata(bytes), type, stripped: true };
  return { bytes, type, stripped: false };
}

/** Map a detected type to a canonical file extension. */
export function extForType(type) {
  return { jpeg: "jpg", png: "png", gif: "gif", webp: "webp" }[type] ?? null;
}
