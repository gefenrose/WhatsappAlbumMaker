import JSZip from "jszip";
import type { AlbumItem, Language, VisibleFields } from "../types";
import { sanitizeDownloadFilename, sanitizeMediaFilename, uniqueFilename } from "./filenames";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type PhotoEntry = {
  src: string;
  alt: string;
  datetime: string;
  sender: string;
  caption: string;
};

function renderCard(
  item: AlbumItem,
  mediaFilename: string,
  noCaptionLabel: string,
  visibleFields: VisibleFields,
  photoIndex: number | null
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
      : `<img class="media media--photo" src="${mediaSrc}" alt="${escapeHtml(item.caption || mediaFilename)}" loading="lazy" data-photo-index="${photoIndex}" />`;

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

/** Embeds photo data as JSON for the lightbox script, guarding against a
 * caption containing a literal "</script>" from breaking out of the tag. */
function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function buildHtmlDocument(
  title: string,
  rtl: boolean,
  language: Language,
  cardsHtml: string,
  photoEntries: PhotoEntry[],
  lightboxLabels: { close: string; previous: string; next: string }
): string {
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
  .media-wrap { aspect-ratio: 4 / 3; background: #f0ede6; position: relative; }
  .media { width: 100%; height: 100%; object-fit: cover; display: block; background: #000; }
  .media--photo { cursor: zoom-in; }
  .card-body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 4px; }
  .datetime { margin: 0; font-size: 0.8rem; color: #756f68; }
  .sender { margin: 0; font-weight: 700; }
  .caption { margin: 6px 0 0; font-size: 0.95rem; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; }
  .caption.empty { color: #756f68; font-style: italic; }

  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(20, 18, 16, 0.92);
    display: none;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .lightbox.is-open { display: flex; }
  .lightbox__content { display: flex; flex-direction: column; align-items: center; gap: 12px; max-width: 100%; max-height: 100%; }
  .lightbox__image { max-width: 100%; max-height: 75vh; object-fit: contain; border-radius: 8px; display: block; }
  .lightbox__caption { text-align: center; color: #fff; max-width: 640px; }
  .lightbox__datetime { margin: 0; font-size: 0.8rem; color: rgba(255, 255, 255, 0.7); }
  .lightbox__sender { margin: 4px 0 0; font-weight: 700; }
  .lightbox__text { margin: 6px 0 0; font-size: 0.95rem; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; }
  .lightbox__close, .lightbox__nav {
    position: absolute;
    border: none;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    cursor: pointer;
  }
  .lightbox__close { top: 16px; inset-inline-end: 16px; width: 40px; height: 40px; font-size: 1.1rem; }
  .lightbox__nav { top: 50%; transform: translateY(-50%); width: 48px; height: 48px; font-size: 2rem; line-height: 1; }
  .lightbox__nav--prev { inset-inline-start: 16px; }
  .lightbox__nav--next { inset-inline-end: 16px; }
</style>
</head>
<body>
  <header><h1>${escapeHtml(title)}</h1></header>
  <div class="grid">${cardsHtml}
  </div>

  <div class="lightbox" id="lightbox" role="dialog" aria-modal="true">
    <button type="button" class="lightbox__close" id="lightbox-close" aria-label="${escapeHtml(lightboxLabels.close)}">✕</button>
    <button type="button" class="lightbox__nav lightbox__nav--prev" id="lightbox-prev" aria-label="${escapeHtml(lightboxLabels.previous)}">‹</button>
    <div class="lightbox__content">
      <img class="lightbox__image" id="lightbox-image" src="" alt="" />
      <div class="lightbox__caption" id="lightbox-caption"></div>
    </div>
    <button type="button" class="lightbox__nav lightbox__nav--next" id="lightbox-next" aria-label="${escapeHtml(lightboxLabels.next)}">›</button>
  </div>

  <script>
    (function () {
      var isRtl = ${rtl ? "true" : "false"};
      var photos = ${serializeForInlineScript(photoEntries)};
      var lightbox = document.getElementById("lightbox");
      var image = document.getElementById("lightbox-image");
      var caption = document.getElementById("lightbox-caption");
      var closeBtn = document.getElementById("lightbox-close");
      var prevBtn = document.getElementById("lightbox-prev");
      var nextBtn = document.getElementById("lightbox-next");
      var currentIndex = -1;

      function render() {
        var item = photos[currentIndex];
        image.src = item.src;
        image.alt = item.alt;
        var html = "";
        if (item.datetime) html += '<p class="lightbox__datetime"></p>';
        if (item.sender) html += '<p class="lightbox__sender"></p>';
        if (item.caption) html += '<p class="lightbox__text"></p>';
        caption.innerHTML = html;
        var parts = caption.querySelectorAll("p");
        var i = 0;
        if (item.datetime) parts[i++].textContent = item.datetime;
        if (item.sender) parts[i++].textContent = item.sender;
        if (item.caption) parts[i++].textContent = item.caption;
        prevBtn.style.display = currentIndex > 0 ? "" : "none";
        nextBtn.style.display = currentIndex < photos.length - 1 ? "" : "none";
      }

      function open(index) {
        currentIndex = index;
        render();
        lightbox.classList.add("is-open");
        document.body.style.overflow = "hidden";
      }

      function close() {
        lightbox.classList.remove("is-open");
        document.body.style.overflow = "";
      }

      function showPrev() {
        if (currentIndex > 0) open(currentIndex - 1);
      }

      function showNext() {
        if (currentIndex < photos.length - 1) open(currentIndex + 1);
      }

      document.querySelectorAll("[data-photo-index]").forEach(function (el) {
        el.addEventListener("click", function () {
          open(Number(el.getAttribute("data-photo-index")));
        });
      });

      closeBtn.addEventListener("click", close);
      lightbox.addEventListener("click", function (event) {
        if (event.target === lightbox) close();
      });
      prevBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        showPrev();
      });
      nextBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        showNext();
      });
      document.addEventListener("keydown", function (event) {
        if (!lightbox.classList.contains("is-open")) return;
        if (event.key === "Escape") close();
        // The prev/next buttons swap sides in RTL (inset-inline-start/end),
        // so the arrow keys must follow the same physical left/right mapping.
        if (event.key === "ArrowRight") { if (isRtl) showPrev(); else showNext(); }
        if (event.key === "ArrowLeft") { if (isRtl) showNext(); else showPrev(); }
      });
    })();
  </script>
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
    lightboxLabels: { close: string; previous: string; next: string };
  }
): Promise<void> {
  const zip = new JSZip();
  const mediaFolder = zip.folder("media");
  if (!mediaFolder) throw new Error("Could not create media folder in zip");

  const usedFilenames = new Set<string>();
  const photoEntries: PhotoEntry[] = [];
  const cardsHtml = albumItems
    .map((item) => {
      const filename = uniqueFilename(sanitizeMediaFilename(item.media.filename), usedFilenames);
      mediaFolder.file(filename, item.media.blob);

      let photoIndex: number | null = null;
      if (item.media.type === "image") {
        const dateTime = [
          options.visibleFields.date ? item.dateRaw : "",
          options.visibleFields.time ? item.timeRaw : "",
        ]
          .filter(Boolean)
          .join(" · ");
        photoIndex = photoEntries.length;
        photoEntries.push({
          src: `media/${encodeURIComponent(filename)}`,
          alt: item.caption || filename,
          datetime: dateTime,
          sender: options.visibleFields.sender ? item.sender || "" : "",
          caption: options.visibleFields.caption ? item.caption : "",
        });
      }

      return renderCard(item, filename, options.noCaptionLabel, options.visibleFields, photoIndex);
    })
    .join("");

  const html = buildHtmlDocument(
    options.title,
    options.rtl,
    options.language,
    cardsHtml,
    photoEntries,
    options.lightboxLabels
  );
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
