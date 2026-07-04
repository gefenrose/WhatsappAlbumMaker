import JSZip from "jszip";
import type { AlbumItem, Language, VisibleFields } from "../types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "media";
}

/** Keeps Unicode (e.g. Hebrew) titles intact for the downloaded filename,
 * only stripping characters that are illegal on common filesystems. */
function sanitizeDownloadFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  return cleaned || "digital-album";
}

/** Keeps generated filenames unique inside the media/ folder of the zip. */
function uniqueFilename(desired: string, used: Set<string>): string {
  if (!used.has(desired)) {
    used.add(desired);
    return desired;
  }
  const dotIndex = desired.lastIndexOf(".");
  const base = dotIndex === -1 ? desired : desired.slice(0, dotIndex);
  const ext = dotIndex === -1 ? "" : desired.slice(dotIndex);
  let counter = 1;
  let candidate = `${base}-${counter}${ext}`;
  while (used.has(candidate)) {
    counter += 1;
    candidate = `${base}-${counter}${ext}`;
  }
  used.add(candidate);
  return candidate;
}

function renderCard(
  item: AlbumItem,
  mediaFilename: string,
  noCaptionLabel: string,
  visibleFields: VisibleFields
): string {
  const dateTime = [
    visibleFields.date ? item.dateRaw : "",
    visibleFields.time ? item.timeRaw : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const mediaSrc = `media/${encodeURIComponent(mediaFilename)}`;
  const mediaTag =
    item.media.type === "video"
      ? `<video class="media" src="${mediaSrc}" controls preload="metadata"></video>`
      : `<img class="media" src="${mediaSrc}" alt="${escapeHtml(item.caption || mediaFilename)}" loading="lazy" />`;

  return `
    <article class="card">
      <div class="media-wrap">${mediaTag}</div>
      <div class="card-body">
        ${dateTime ? `<p class="datetime">${escapeHtml(dateTime)}</p>` : ""}
        ${visibleFields.sender && item.sender ? `<p class="sender">${escapeHtml(item.sender)}</p>` : ""}
        ${visibleFields.caption ? `<p class="caption${item.caption ? "" : " empty"}">${escapeHtml(item.caption || noCaptionLabel)}</p>` : ""}
      </div>
    </article>`;
}

function buildHtmlDocument(title: string, rtl: boolean, language: Language, cardsHtml: string): string {
  return `<!doctype html>
<html lang="${language}" dir="${rtl ? "rtl" : "ltr"}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #faf7f2;
    color: #2c2a28;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  }
  header { padding: 28px 16px 16px; text-align: center; }
  h1 { margin: 0; font-size: 1.75rem; }
  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 16px;
    max-width: 1200px;
    margin: 0 auto;
  }
  @media (min-width: 640px) { .grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 960px) { .grid { grid-template-columns: repeat(3, 1fr); } }
  .card {
    background: #fff;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(44, 42, 40, 0.08);
    display: flex;
    flex-direction: column;
  }
  .media-wrap { aspect-ratio: 4 / 3; background: #f0ede6; }
  .media { width: 100%; height: 100%; object-fit: cover; display: block; background: #000; }
  .card-body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 4px; }
  .datetime { margin: 0; font-size: 0.8rem; color: #756f68; }
  .sender { margin: 0; font-weight: 700; }
  .caption { margin: 6px 0 0; font-size: 0.95rem; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; }
  .caption.empty { color: #756f68; font-style: italic; }
</style>
</head>
<body>
  <header><h1>${escapeHtml(title)}</h1></header>
  <div class="grid">${cardsHtml}
  </div>
</body>
</html>`;
}

export async function exportDigitalAlbum(
  albumItems: AlbumItem[],
  options: {
    title: string;
    rtl: boolean;
    language: Language;
    noCaptionLabel: string;
    visibleFields: VisibleFields;
  }
): Promise<void> {
  const zip = new JSZip();
  const mediaFolder = zip.folder("media");
  if (!mediaFolder) throw new Error("Could not create media folder in zip");

  const usedFilenames = new Set<string>();
  const cardsHtml = albumItems
    .map((item) => {
      const filename = uniqueFilename(sanitizeFilename(item.media.filename), usedFilenames);
      mediaFolder.file(filename, item.media.blob);
      return renderCard(item, filename, options.noCaptionLabel, options.visibleFields);
    })
    .join("");

  const html = buildHtmlDocument(options.title, options.rtl, options.language, cardsHtml);
  zip.file("index.html", html);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeDownloadFilename(options.title)}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
