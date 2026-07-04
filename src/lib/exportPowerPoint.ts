import pptxgen from "pptxgenjs";
import type { AlbumItem, Language } from "../types";

const SLIDE_WIDTH_IN = 13.33;

const IMAGE_BOX = { x: 1.665, y: 0.4, w: 10.0, h: 4.9 };
const TEXT_X = 0.9;
const TEXT_W = SLIDE_WIDTH_IN - TEXT_X * 2;

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Reads natural pixel dimensions of an image so it can be fit into a box
 * without distortion. */
async function getImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function fitWithinBox(
  imageWidth: number,
  imageHeight: number,
  box: { x: number; y: number; w: number; h: number }
): { x: number; y: number; w: number; h: number } {
  const imageRatio = imageWidth / imageHeight;
  const boxRatio = box.w / box.h;

  let w: number;
  let h: number;
  if (imageRatio > boxRatio) {
    w = box.w;
    h = box.w / imageRatio;
  } else {
    h = box.h;
    w = box.h * imageRatio;
  }

  const x = box.x + (box.w - w) / 2;
  const y = box.y + (box.h - h) / 2;
  return { x, y, w, h };
}

export async function exportAlbumAsPowerPoint(
  albumItems: AlbumItem[],
  options?: {
    title?: string;
    rtl?: boolean;
    language?: Language;
  }
): Promise<void> {
  const rtl = options?.rtl ?? false;
  const noCaptionLabel = options?.language === "he" ? "אין כיתוב" : "No caption";

  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.rtlMode = rtl;
  if (options?.title) {
    pptx.title = options.title;
  }

  for (const item of albumItems) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };

    try {
      const dataUrl = await blobToDataUrl(item.media.blob);
      const { width, height } = await getImageDimensions(dataUrl);
      const box = fitWithinBox(width, height, IMAGE_BOX);
      slide.addImage({ data: dataUrl, x: box.x, y: box.y, w: box.w, h: box.h });
    } catch {
      slide.addText(options?.language === "he" ? "לא ניתן לטעון תמונה" : "Image could not be loaded", {
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

    const dateTimeText = [item.dateRaw, item.timeRaw].filter(Boolean).join(" · ");
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

    slide.addText(item.sender || "", {
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

  await pptx.writeFile({ fileName: "whatsapp-album.pptx" });
}
