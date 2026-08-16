# PSDTool

[English](README.md) | [日本語](README.ja.md) | [中文](README.zh.md)

A modern web remake of [PSDTool](https://github.com/ChibiCC/PSDTool) — an interactive PSD layer viewer with live preview, layer toggling, flip pairing, and PNG export.

## Features

- **PSD parsing** via [ag-psd](https://github.com/Agamnentzar/ag-psd) (no Go/WebAssembly dependency)
- **Layer tree** with radio groups (`*`), force-visible (`!`), and flip pairing (`:flipx` / `:flipy` / `:flipxy`)
- **Live rendering** with blend modes, clipping masks, layer masks, and pass-through folders
- **Flip & scale** — horizontal/vertical flip, downscale to a target pixel count
- **PNG export** — sequential filename with custom prefix and auto-incrementing number
- **Layer thumbnails** in the tree for quick identification
- **i18n** — English / Japanese / Chinese, auto-detected from browser language
- **Responsive UI** with adjustable split-pane layout

## Tech Stack

- TypeScript (strict)
- Vite
- ag-psd
- Hand-written CSS (Bootstrap 3 visual style, no framework dependency)

## Quick Start

```bash
npm install
npm run dev      # start dev server at http://localhost:5173
npm run build    # production build to dist/
```

Open a `.psd` file via the file picker or drag & drop. Toggle layers in the tree, flip or scale as needed, then click `.png` to export.

## Project Structure

```
src/
  main.ts            # app entry, orchestrates load/render/export
  i18n.ts            # translations and language detection
  psd-adapter.ts     # ag-psd → internal Root/Layer types
  renderer.ts        # layer compositing pipeline
  layertree.ts       # tree state, token parsing, flip groups
  downscaler.ts      # image downscaling
  blend/blend.ts     # pure-TS blend mode implementations
  ui/
    file-open.ts     # file open screen
    main-view.ts     # main UI scaffold (split-pane, toolbar, preview)
  styles/
    main.css         # all styling
```

## Differences from Original

| Aspect | Original | This remake |
|--------|----------|-------------|
| PSD parser | Go → WebAssembly | ag-psd (pure JS) |
| UI framework | Bootstrap 3 + jstree | Hand-written CSS |
| Module bundler | webpack | Vite |
| Build deps | Go toolchain | Node.js only |

## License

MIT
