# WhatsApp Album Maker

A local-first web app that turns a WhatsApp group chat export into a digital
keepsake photo (and video) album you can export and share as a self-contained
`.zip`. Everything — unzipping, parsing, matching captions, and exporting —
runs entirely in your browser. Nothing is uploaded anywhere.

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
- Click or tap any photo to open it full-screen in a lightbox, with
  previous/next navigation and keyboard support (arrow keys, Escape).
- Optional "Include videos" toggle to bring videos from the chat into the
  album alongside photos, playable inline.
- Toggles to show/hide each piece of info per card — date, time, sender name,
  and message text — independently, both on screen and in the exported album.
- Select photos and delete them from the album, with a one-click Undo.
- Filter by "all / with captions / missing captions", and by one or more
  senders at once (toggle any combination of senders on or off).
- The exported album is automatically named after the WhatsApp chat itself
  (pulled from a "created group" message when available, otherwise from the
  exported `.zip`'s own filename).
- Opens in Hebrew by default, with a one-click toggle to English (and back).
  Layout mirrors to RTL/LTR automatically.
- In-app step-by-step instructions for exporting a chat from WhatsApp, shown
  right above the import box.
- One-click **Export Digital Album**: downloads a self-contained `.zip`
  containing an `index.html` viewer plus a `media/` folder with all the
  photos and videos. Unzip it anywhere and open `index.html` in any browser —
  no internet connection or app required — to browse every photo and video
  with its date, sender, and caption. Since it's just an HTML page, videos
  play natively, and photos open in the same click-to-magnify lightbox as
  the in-app preview (with previous/next navigation).
- **Export as Word** (`.docx`) and **Export as PowerPoint** (`.pptx`), for
  sharing the album as a document or presentation. Both include one photo
  per page/slide with date, sender, and caption, honor the "Show:" field
  toggles, and support RTL text. Neither format can embed a truly playable
  video, so video items appear as a clickable link instead — if the export
  includes any videos, the download becomes a `.zip` containing the
  document/presentation plus a `media/` folder, and the link opens the
  video file once you've unzipped it (keep the two together).

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

> **Please note:** the exported `.zip` only includes photos and videos that
> have already been downloaded and are visible in that WhatsApp chat — not
> your phone's full camera roll, other chats, or media still marked "tap to
> download." If needed, open those items in WhatsApp first so they're saved
> to the chat before exporting.

## Using the app

1. Import your exported `.zip`.
2. The app extracts the chat text file (`_chat.txt`) and any photos inside the
   ZIP, entirely in memory in your browser.
3. Photos are automatically paired with a caption based on the chat messages
   around them. Each card shows a confidence badge when the app had to guess
   ("suggested caption") or couldn't find a caption at all ("needs caption").
4. Click any caption to edit it manually.
5. Use the filters in the toolbar to review "missing captions" or focus on a
   specific sender. Use the "Show:" toggles to hide date, time, sender, or
   message text if you'd rather keep the album simpler.
6. When you're happy with the album, choose an export:
   - **Export Digital Album** downloads a `.zip` named after the chat itself,
     which you can keep, share, or archive — unzip it and open `index.html`
     to view the album offline in any browser.
   - **Export as Word** or **Export as PowerPoint** downloads a `.docx` or
     `.pptx` file instead, for sharing as a document or presentation. If the
     export includes videos, you'll get a `.zip` (document + `media/`
     folder) instead of a single file — unzip it and keep both together so
     the video links work.

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [JSZip](https://stuk.github.io/jszip/) for in-browser ZIP extraction and
  for building the exported digital album `.zip`
- [docx](https://docx.js.org/) for Word export, [pptxgenjs](https://gitbrent.github.io/PptxGenJS/)
  for PowerPoint export — both lazy-loaded only when you use that export
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
    Toolbar.tsx              Filters, language switch, export action
  lib/
    zipUtils.ts               ZIP extraction, media file discovery
    parseWhatsAppChat.ts      WhatsApp chat text parser
    buildAlbumItems.ts        Photo <-> caption matching logic
    exportDigitalAlbum.ts     Builds the exported album .zip (HTML + media) via JSZip
    exportWord.ts             Builds the exported .docx via the docx library
    exportPowerPoint.ts       Builds the exported .pptx via pptxgenjs
    imageConversion.ts        Canvas-based image decoding + PNG conversion, shared by both
    filenames.ts              Shared download-filename sanitizing
    i18n.ts                   English/Hebrew strings + RTL helper
  types.ts                    Shared TypeScript types
  styles.css                  Global styles, responsive grid
```

## Notes & limitations

- The parser supports the most common WhatsApp export formats. Extremely
  unusual locales/date formats may need small parser tweaks.
- Videos are off by default in the on-screen album (photo-first) — turn on
  "Include videos" in the toolbar to bring them into view and into any
  export. In Word/PowerPoint, a video's link only resolves if the `.docx`/
  `.pptx` and its `media/` folder stay in the same place after unzipping.
- Large exports (many hundreds of photos) may take a few seconds to process
  since everything runs on-device.
