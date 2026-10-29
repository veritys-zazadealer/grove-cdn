# app icons

Drop your SVGs (or PNGs) here using the filenames below. They'll be picked up
automatically by both the desktop icons and the dock — no code changes needed.

| filename | used for |
|---|---|
| `games.svg`    | Games app icon |
| `music.svg`    | Music app icon |
| `movies.svg`   | Movies app icon |
| `browser.svg`  | Browser app icon |
| `settings.svg` | Settings app icon |

## load order
1. `assets/icons/<id>.svg` (preferred)
2. `assets/icons/<id>.png` (fallback if SVG 404s)
3. inline custom illustration (fallback if both 404 — used in dev right now)

So you can swap any one icon at a time; missing files quietly fall back to
the custom illustration.

## sizing
- Recommended: square viewBox (e.g. `0 0 64 64`), centered artwork
- The icon container is 60×60 with the artwork rendered at ~64% (≈38×38)
- Padding handled by CSS, so don't pad inside the SVG
- For PNGs: 128×128 or 256×256 — they'll be downscaled cleanly

## sourcing
You're responsible for sourcing your own art. Make sure you have rights/license
to ship whatever you drop in here before deploying to production.
