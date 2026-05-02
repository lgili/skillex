# Demo media

This directory holds the screencasts and screenshots referenced from the main
project `README.md`. Binaries are **not** committed to keep the npm tarball
small (`package.json#files` only ships `bin`, `dist`, `dist-ui`, `README.md`,
and `CHANGELOG.md`).

## Files expected here

| File | What it shows | How to regenerate |
|------|---------------|-------------------|
| `tui.gif` | Quick demo of the no-args TUI: launch → filter → space-select → enter to install. ~10s loop. | Record with `asciinema rec` then convert with `agg`, or use `vhs` (`https://github.com/charmbracelet/vhs`). Target 720×420 viewport. |
| `web-ui.png` | Catalog page with one card hovered, showing the install/installed states. | `skillex ui` in a workspace with at least the recommended pack installed; native screenshot at 1280×800. |
| `web-ui-doctor.png` | Doctor panel with a mix of pass / warn / fail rows. | Same as above; navigate to `/doctor` after the catalog loads. |

## Recording with VHS (recommended for `tui.gif`)

`tui.tape`:

```tape
Output tui.gif
Set FontSize 14
Set Width 1100
Set Height 600
Type "skillex" Sleep 500ms Enter
Sleep 1.5s
Type "git" Sleep 800ms
Down Down Space Down Space Enter
Sleep 2s
```

Run: `vhs tui.tape`.

## Why we keep this out of the npm package

GIFs and PNGs add real weight to the published tarball (every `npm install`
pays the bandwidth cost). Hosting them in the repository and linking via raw
GitHub URLs from the README is the standard tradeoff for OSS CLIs.
