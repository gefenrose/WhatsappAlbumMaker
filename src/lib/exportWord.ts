import JSZip from "jszip";
import { AlignmentType, Document, ExternalHyperlink, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from "docx";
import type { AlbumItem, VisibleFields } from "../types";
import { convertImageToPng, fitWithinBox } from "./imageConversion";
import { sanitizeDownloadFilename, sanitizeMediaFilename, uniqueFilename } from "./filenames";

const IMAGE_BOX = { width: 500, height: 500 };

function paragraphAlignment(rtl: boolean) {
  return rtl ? AlignmentType.RIGHT : AlignmentType.LEFT;
}

type VideoLink = { filename: string; blob: Blob };

async function buildItemParagraphs(
  item: AlbumItem,
  options: { rtl: boolean; noCaptionLabel: string; videoLabel: string; visibleFields: VisibleFields },
  isFirst: boolean,
  usedMediaFilenames: Set<string>,
  videoLinks: VideoLink[]
): Promise<Paragraph[]> {
  const { rtl, noCaptionLabel, videoLabel, visibleFields } = options;
  const alignment = paragraphAlignment(rtl);
  const paragraphs: Paragraph[] = [];

  if (item.media.type === "video") {
    const filename = uniqueFilename(sanitizeMediaFilename(item.media.filename), usedMediaFilenames);
    videoLinks.push({ filename, blob: item.media.blob });

    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: rtl,
        pageBreakBefore: !isFirst,
        children: [
          new ExternalHyperlink({
            link: `media/${filename}`,
            children: [
              new TextRun({
                text: `🎥 ${videoLabel}: ${item.media.filename}`,
                size: 24,
                color: "1155CC",
                underline: {},
              }),
            ],
          }),
        ],
      })
    );
  } else {
    try {
      const { dataUrl, width, height } = await convertImageToPng(item.media.blob);
      const size = fitWithinBox(width, height, IMAGE_BOX);
      const response = await fetch(dataUrl);
      const data = await response.arrayBuffer();
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: rtl,
          pageBreakBefore: !isFirst,
          children: [
            new ImageRun({
              type: "png",
              data,
              transformation: { width: Math.round(size.width), height: Math.round(size.height) },
            }),
          ],
        })
      );
    } catch {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: rtl,
          pageBreakBefore: !isFirst,
          children: [new TextRun({ text: "Image could not be loaded", color: "999999", italics: true })],
        })
      );
    }
  }

  const dateTime = [
    visibleFields.date ? item.dateRaw : "",
    visibleFields.time ? item.timeRaw : "",
  ]
    .filter(Boolean)
    .join(" · ");

  if (dateTime) {
    paragraphs.push(
      new Paragraph({
        alignment,
        bidirectional: rtl,
        spacing: { before: 200 },
        children: [new TextRun({ text: dateTime, size: 20, color: "666666" })],
      })
    );
  }

  if (visibleFields.sender && item.sender) {
    paragraphs.push(
      new Paragraph({
        alignment,
        bidirectional: rtl,
        children: [new TextRun({ text: item.sender, bold: true, size: 26, color: "222222" })],
      })
    );
  }

  if (visibleFields.caption) {
    paragraphs.push(
      new Paragraph({
        alignment,
        bidirectional: rtl,
        children: [
          new TextRun({
            text: item.caption || noCaptionLabel,
            italics: !item.caption,
            size: 22,
            color: item.caption ? "333333" : "999999",
          }),
        ],
      })
    );
  }

  return paragraphs;
}

export async function exportAlbumAsWord(
  albumItems: AlbumItem[],
  options: {
    title: string;
    rtl: boolean;
    noCaptionLabel: string;
    videoLabel: string;
    visibleFields: VisibleFields;
  }
): Promise<void> {
  const titleParagraph = new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    bidirectional: options.rtl,
    children: [new TextRun({ text: options.title })],
  });

  const usedMediaFilenames = new Set<string>();
  const videoLinks: VideoLink[] = [];
  const itemParagraphLists = await Promise.all(
    albumItems.map((item, index) =>
      buildItemParagraphs(item, options, index === 0, usedMediaFilenames, videoLinks)
    )
  );

  const doc = new Document({
    title: options.title,
    sections: [
      {
        children: [titleParagraph, ...itemParagraphLists.flat()],
      },
    ],
  });

  const docxBlob = await Packer.toBlob(doc);
  const safeTitle = sanitizeDownloadFilename(options.title);

  if (videoLinks.length === 0) {
    downloadBlob(docxBlob, `${safeTitle}.docx`);
    return;
  }

  // Videos can't be embedded as playable media in .docx, so they're linked
  // instead — bundling the document with a sibling media/ folder in a zip
  // keeps that link resolvable once extracted.
  const zip = new JSZip();
  zip.file(`${safeTitle}.docx`, docxBlob);
  const mediaFolder = zip.folder("media");
  if (!mediaFolder) throw new Error("Could not create media folder in zip");
  for (const { filename, blob } of videoLinks) {
    mediaFolder.file(filename, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, `${safeTitle} (Word).zip`);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
