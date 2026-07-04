import pptxgen from "pptxgenjs";
import type { AlbumItem, Language, VisibleFields } from "../types";
import { convertImageToPng, fitWithinBox } from "./imageConversion";
import { sanitizeDownloadFilename } from "./filenames";

const SLIDE_WIDTH_IN = 13.33;
const IMAGE_BOX = { x: 1.665, y: 0.4, w: 10.0, h: 4.9 };
const TEXT_X = 0.9;
const TEXT_W = SLIDE_WIDTH_IN - TEXT_X * 2;

export async function exportAlbumAsPowerPoint(
  albumItems: AlbumItem[],
  options: {
    title: string;
    rtl: boolean;
    language: Language;
    noCaptionLabel: string;
    videoLabel: string;
    visibleFields: VisibleFields;
  }
): Promise<void> {
  const { rtl, visibleFields, noCaptionLabel, videoLabel } = options;

  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.rtlMode = rtl;
  pptx.title = options.title;

  for (const item of albumItems) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };

    if (item.media.type === "video") {
      slide.addShape(pptx.ShapeType.rect, {
        x: IMAGE_BOX.x,
        y: IMAGE_BOX.y,
        w: IMAGE_BOX.w,
        h: IMAGE_BOX.h,
        fill: { color: "EFEFEF" },
        line: { color: "CCCCCC", width: 1 },
      });
      slide.addText(`🎥\n${videoLabel}: ${item.media.filename}`, {
        x: IMAGE_BOX.x,
        y: IMAGE_BOX.y,
        w: IMAGE_BOX.w,
        h: IMAGE_BOX.h,
        align: "center",
        valign: "middle",
        fontSize: 20,
        color: "555555",
      });
    } else {
      try {
        const { dataUrl, width, height } = await convertImageToPng(item.media.blob);
        const size = fitWithinBox(width, height, { width: IMAGE_BOX.w, height: IMAGE_BOX.h });
        const x = IMAGE_BOX.x + (IMAGE_BOX.w - size.width) / 2;
        const y = IMAGE_BOX.y + (IMAGE_BOX.h - size.height) / 2;
        slide.addImage({ data: dataUrl, x, y, w: size.width, h: size.height });
      } catch {
        slide.addText(options.language === "he" ? "לא ניתן לטעון תמונה" : "Image could not be loaded", {
          x: IMAGE_BOX.x,
          y: IMAGE_BOX.y,
          w: IMAGE_BOX.w,
          h: IMAGE_BOX.h,
          align: "center",
          valign: "middle",
          fontSize: 16,
          color: "999999",
        });
      }
    }

    const dateTimeText = [
      visibleFields.date ? item.dateRaw : "",
      visibleFields.time ? item.timeRaw : "",
    ]
      .filter(Boolean)
      .join(" · ");

    if (dateTimeText) {
      slide.addText(dateTimeText, {
        x: TEXT_X,
        y: 5.55,
        w: TEXT_W,
        h: 0.3,
        fontSize: 12,
        color: "666666",
        align: rtl ? "right" : "left",
        rtlMode: rtl,
      });
    }

    if (visibleFields.sender && item.sender) {
      slide.addText(item.sender, {
        x: TEXT_X,
        y: 5.9,
        w: TEXT_W,
        h: 0.4,
        fontSize: 18,
        bold: true,
        color: "222222",
        align: rtl ? "right" : "left",
        rtlMode: rtl,
      });
    }

    if (visibleFields.caption) {
      slide.addText(item.caption || noCaptionLabel, {
        x: TEXT_X,
        y: 6.35,
        w: TEXT_W,
        h: 0.9,
        fontSize: item.caption ? 14 : 12,
        italic: !item.caption,
        color: item.caption ? "333333" : "999999",
        align: rtl ? "right" : "left",
        rtlMode: rtl,
        fit: "shrink",
        wrap: true,
      });
    }
  }

  await pptx.writeFile({ fileName: `${sanitizeDownloadFilename(options.title)}.pptx` });
}
