# WhatsApp Album Maker

A local-first web app that turns a WhatsApp group chat export into a printable
family photo album. Everything — unzipping, parsing, matching captions, and
exporting — runs entirely in your browser. Nothing is uploaded anywhere.

## Privacy

- The chat export never leaves your device.
- There is no backend, no database, and no network request involving your data.
- The ZIP is parsed with [JSZip](https://stuk.github.io/jszip/) directly in the browser.
- Photos are kept as in-memory blobs / object URLs for the duration of your session.

## Features

- Drag-and-drop (or click-to-browse) import of a WhatsApp chat export `.zip`.
- Robust parser for WhatsApp's export formats (Android `date, time - Sender: text`
  and iOS `[date, time] Sender: text`), including multi-line messages, system
  messages, and Hebrew/RTL text.
- Automatic matching of photos to captions, using the message's own text first
  and falling back to nearby messages from the same sender.
- Editable album preview — click any caption to correct it.
- Select photos and delete them from the album, with a one-click Undo.
- Filter by "all / with captions / missing captions" and by sender.
- Opens in Hebrew by default, with a one-click toggle to English (and back).
  Layout mirrors to RTL/LTR automatically.
- In-app step-by-step instructions for exporting a chat from WhatsApp, shown
  right above the import box.
- Print-friendly layout — use your browser's print dialog to save as PDF, with
  page breaks that never cut a photo card in half.
- One-click export to a PowerPoint (`.pptx`) presentation, with one slide per
  photo (photo, date, time, sender, caption), Hebrew/RTL-aware text.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL in your browser.

To create a production build:

```bash
npm run build
```

The build output is written to `dist/` and can be hosted as static files (or
opened locally) — no server-side code is required.

## How to export your WhatsApp chat

1. Open the WhatsApp group you want to turn into an album.
2. Open the group info (tap the group name/header).
3. Choose **Export Chat**.
4. Choose **Include Media** (this is required — without it, no photos will be
   exported, only text).
5. Save or share the resulting `.zip` file to a location you can access from
   your computer or phone's browser (e.g. AirDrop, email to yourself, a
   cloud drive, or a cable transfer).
6. Open this app and drag the `.zip` file into the import area, or click
   **Choose ZIP file** to select it.

## Using the app

1. Import your exported `.zip`.
2. The app extracts the chat text file (`_chat.txt`) and any photos inside the
   ZIP, entirely in memory in your browser.
3. Photos are automatically paired with a caption based on the chat messages
   around them. Each card shows a confidence badge when the app had to guess
   ("suggested caption") or couldn't find a caption at all ("needs caption").
4. Click any caption to edit it manually.
5. Use the filters in the toolbar to review "missing captions" or focus on a
   specific sender.
6. When you're happy with the album:
   - Click **Print / Save as PDF** to use your browser's native print dialog.
   - Click **Export as PowerPoint** to download a `.pptx` file with one slide
     per photo, ready to open in Microsoft PowerPoint, Apple Keynote, or
     Google Slides.

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [JSZip](https://stuk.github.io/jszip/) for in-browser ZIP extraction
- [pptxgenjs](https://gitbrent.github.io/PptxGenJS/) for PowerPoint export
- Plain CSS (no UI framework), mobile-first, with RTL support
- No backend, no database, no analytics

## Project structure

```
src/
  App.tsx                    Top-level app state and layout
  components/
    ZipImporter.tsx          Drag & drop / file picker
    AlbumPreview.tsx         Grid + filtering of album items
    AlbumCard.tsx            Single photo card (photo, date, sender, caption)
    CaptionEditor.tsx        Inline caption editing UI
    Toolbar.tsx              Filters, language switch, print/export actions
  lib/
    zipUtils.ts               ZIP extraction, media file discovery
    parseWhatsAppChat.ts      WhatsApp chat text parser
    buildAlbumItems.ts        Photo <-> caption matching logic
    exportPowerPoint.ts       .pptx generation via pptxgenjs
    i18n.ts                   English/Hebrew strings + RTL helper
  types.ts                    Shared TypeScript types
  styles.css                  Global styles, responsive grid, print rules
```

## Notes & limitations

- The parser supports the most common WhatsApp export formats. Extremely
  unusual locales/date formats may need small parser tweaks.
- Videos are extracted from the ZIP but are not currently placed into the
  photo album grid (the album is photo-focused, per the original chat's
  intent as a printable album).
- Large exports (many hundreds of photos) may take a few seconds to process
  since everything runs on-device.
