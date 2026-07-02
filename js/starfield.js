// starfield.js — the 2013 warp starfield, ported from archive/v1/js/stars.js.
// Same physics as the original: stars stream outward from the center along their slope,
// fading in as they accelerate, recycled near the middle when they exit the frame, with
// the classic motion trail from painting a translucent black over each frame. Modernized:
// ES module, no vendor shims, honors prefers-reduced-motion with a static night sky.

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

class Star {
  constructor(x, y, maxSpeed) {
    this.reset(x, y, maxSpeed);
  }

  reset(x, y, maxSpeed) {
    this.x = x;
    this.y = y;
    // Origin is the canvas center, so the slope alone steers the star. A star born on the
    // exact vertical axis would divide by zero and stall — nudge it onto a diagonal.
    this.slope = x === 0 ? (y || 1) : y / x;
    this.opacity = 0;
    this.speed = Math.max(Math.random() * maxSpeed, 1);
  }
}

/**
 * Kick off the starfield inside `container` (which holds a <canvas>).
 * 333 stars at max speed 3, exactly as the museum hung it in 2013.
 */
export function startStarfield(container, { numStars = 333, maxSpeed = 3 } = {}) {
  const canvasEl = container.querySelector("canvas");
  if (!canvasEl) return;
  const ctx = canvasEl.getContext("2d");
  let width = 0;
  let height = 0;

  const resize = () => {
    width = canvasEl.width = container.offsetWidth;
    height = canvasEl.height = container.offsetHeight;
  };
  resize();
  window.addEventListener("resize", resize);

  const randomBirth = (star) =>
    star.reset(
      Math.floor(Math.random() * width) - width / 2,
      Math.floor(Math.random() * height) - height / 2,
      maxSpeed,
    );

  const stars = Array.from({ length: numStars }, () => {
    const star = new Star(1, 1, maxSpeed);
    randomBirth(star);
    return star;
  });

  const update = () => {
    for (const star of stars) {
      const increment = Math.min(star.speed, Math.abs(star.speed / star.slope));
      star.x += star.x > 0 ? increment : -increment;
      star.y = star.slope * star.x;
      star.opacity += star.speed / 100;
      if (Math.abs(star.x) > width / 2 || Math.abs(star.y) > height / 2) {
        // Recycle near the center, as the original did, so new stars bloom from the middle.
        star.reset(
          Math.floor(Math.random() * (width / 5)) - width / 10,
          Math.floor(Math.random() * (height / 5)) - height / 10,
          maxSpeed,
        );
      }
    }
  };

  const draw = (withTrail) => {
    ctx.fillStyle = withTrail ? "rgba(0, 0, 0, 0.5)" : "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    for (const star of stars) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(star.opacity, 1)})`;
      ctx.fillRect(star.x + width / 2, star.y + height / 2, 2, 2);
    }
    ctx.restore();
  };

  const staticSky = () => {
    for (const star of stars) star.opacity = 0.25 + Math.random() * 0.55;
    draw(false);
  };

  let prevFrameTime = 0;
  let running = false;
  const frame = (elapsed) => {
    if (!running) return;
    if (elapsed - prevFrameTime >= 30 || !prevFrameTime) {
      // Cap to ~30fps, faithful to the 2013 frame budget.
      prevFrameTime = elapsed;
      update();
      draw(true);
    }
    requestAnimationFrame(frame);
  };

  const apply = () => {
    if (REDUCED_MOTION.matches) {
      running = false;
      staticSky();
    } else if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  };

  REDUCED_MOTION.addEventListener?.("change", apply);
  apply();
}
