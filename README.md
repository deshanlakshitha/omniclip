# OmniClip

> Select any element on a webpage — text, images, video, tables or UI blocks — and compile it into a **DOCX, PDF, PPTX, TXT, Markdown or HTML** document.

OmniClip is a Manifest V3 browser extension with a side-panel document builder. Point at anything on a page, capture it as a normalized **block**, arrange blocks across pages, then export to the format you need. A desktop companion app (for video downloading, OCR and pixel-perfect PDF) is planned for a later phase.

This is the **MVP** scaffold: a working end-to-end capture → build → export pipeline.

---

## Features (MVP)

- **Smart context extraction** — element picker overlay; click any element to capture clean text. Uses [Readability](https://github.com/mozilla/readability) to strip boilerplate from large containers, [Turndown](https://github.com/mixmark-io/turndown) for clean Markdown, and [DOMPurify](https://github.com/cure53/DOMPurify) to sanitize HTML. Captures provenance (URL, title, a stable CSS selector, timestamp).
- **DOM-tree navigation** — `Alt + scroll` while picking to widen/narrow the selection up and down the DOM tree.
- **Region capture** — drag a rectangle to grab all text intersecting an area.
- **Image handling** — auto-detects `<img>` / `srcset` / `<picture>` / CSS backgrounds, picks the highest-res source, and downloads + embeds bytes (fetched in the background worker to avoid page CORS). Manual "Download & embed" per image.
- **Video detection** — detects `<video>` / `<source>` / `<iframe>` embeds and records the source (full download via the desktop companion in a later phase).
- **Document management** — multiple pages: add, delete, reorder; drag-and-drop block reordering; move blocks between pages; inline text/caption editing.
- **Action controls** — **Deselect** (Esc), **Undo** / **Redo** (Ctrl+Z / Ctrl+Shift+Z), powered by an immutable history stack.
- **Advanced saving** — **auto-save** to IndexedDB (debounced) plus **manual export** to DOCX, PDF, PPTX, Markdown, HTML and TXT.

---

## Architecture

Two layers linked by one **Block** data model:

```
packages/
├─ shared/        # Block / Page / Project schema + pure ops + markdown serialization
├─ export-core/   # format exporters (txt, md, html, docx, pdf, pptx) behind one interface
└─ extension/     # MV3 extension: content script (picker + extractors),
                  #   background worker (asset download), side panel (React UI + store)
```

The **Block** is the contract: every capture feature produces blocks; every exporter consumes a `Project` of blocks. New sources and new formats evolve independently. See `packages/shared/src/types.ts`.

**Tech stack:** TypeScript, React 18, Vite + `@crxjs/vite-plugin`, Zustand + Immer + [zundo](https://github.com/charkour/zundo) (undo/redo), dnd-kit (drag-and-drop), idb (IndexedDB), `docx`, `pdf-lib`, `pptxgenjs`.

---

## Getting started

Requires Node 20+ and pnpm 9.

```bash
pnpm install

# build the workspace libraries first
pnpm --filter @omniclip/shared build
pnpm --filter @omniclip/export-core build

# build the extension (outputs to packages/extension/dist)
pnpm --filter @omniclip/extension build
```

### Load the extension in Chrome / Edge

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select `packages/extension/dist`.
4. Click the OmniClip toolbar icon to open the side panel, then **Pick element** and start capturing.

### Develop with hot reload

```bash
pnpm dev   # runs the extension Vite dev server; reload the unpacked extension on changes
```

### Quality checks

```bash
pnpm typecheck   # tsc across all packages
pnpm lint        # eslint
pnpm test        # vitest (schema ops + every exporter)
```

---

## Roadmap

- **Phase 3 — desktop companion (Tauri/Electron):** video download via `yt-dlp`/`ffmpeg`, OCR (Tesseract), high-fidelity Puppeteer PDF, disk auto-save.
- **Phase 4 — advanced:** templates/theming, auto-citations (provenance is already captured), AI assist (summaries, auto-slides), annotations, cloud sync, Firefox build.

See the full product plan in the PR description.

## License

MIT
