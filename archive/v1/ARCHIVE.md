# Feces of the Species — the 2013 original (archived)

This directory preserves the original AngularJS 1.2 / Bootstrap 3 site exactly as it shipped
(commit `6233abb`), five gilded frames and all. It is served read-only
at [`/archive/v1/`](https://fecesofthespecies.com/archive/v1/) for posterity.

One functional change was made so the archive still runs on today's web: the jQuery `<script>`
tag in `index.html` now loads over `https://` instead of `http://` (browsers block mixed content
on HTTPS pages). Everything else is untouched.

Do not develop here. The living site is at the repository root.
