/** Reads a blob as a data URL. */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Decodes any browser-displayable image (jpg/png/webp/gif/...) and
 * re-encodes it as PNG via canvas, since document formats like .docx/.pptx
 * only reliably support a narrow set of embedded image types. Also returns
 * the natural pixel dimensions so the image can be placed without distortion.
 */
export async function convertImageToPng(
  blob: Blob
): Promise<{ dataUrl: string; width: number; height: number }> {
  const sourceDataUrl = await blobToDataUrl(blob);

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = sourceDataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(image, 0, 0);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

export function fitWithinBox(
  imageWidth: number,
  imageHeight: number,
  box: { width: number; height: number }
): { width: number; height: number } {
  const imageRatio = imageWidth / imageHeight;
  const boxRatio = box.width / box.height;

  if (imageRatio > boxRatio) {
    return { width: box.width, height: box.width / imageRatio };
  }
  return { height: box.height, width: box.height * imageRatio };
}
