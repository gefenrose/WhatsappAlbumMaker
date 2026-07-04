import JSZip from "jszip";
import type { MediaFile } from "../types";

export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "heic"];
export const VIDEO_EXTENSIONS = ["mp4", "mov"];
export const MEDIA_EXTENSIONS = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS];

const MAX_ZIP_SIZE_BYTES = 1024 * 1024 * 1024; // 1GB safety cap

export class ZipImportError extends Error {
  code: "no-chat" | "invalid-zip" | "too-large";
  constructor(code: "no-chat" | "invalid-zip" | "too-large", message: string) {
    super(message);
    this.code = code;
  }
}

export type ExtractedChat = {
  chatText: string;
  mediaFiles: MediaFile[];
};

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx === -1) return "";
  return filename.slice(idx + 1).toLowerCase();
}

function mediaTypeForExtension(ext: string): MediaFile["type"] {
  if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (VIDEO_EXTENSIONS.includes(ext)) return "video";
  return "other";
}

/**
 * Chat text files exported by WhatsApp are usually "_chat.txt" but can also
 * be named like "WhatsApp Chat with X.txt" depending on platform/locale.
 */
function looksLikeChatFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".txt") === false) return false;
  return (
    lower.endsWith("_chat.txt") ||
    lower.includes("whatsapp chat") ||
    lower.includes("chat.txt")
  );
}

export async function extractWhatsAppZip(
  file: File,
  onProgress?: (percent: number) => void
): Promise<ExtractedChat> {
  if (file.size > MAX_ZIP_SIZE_BYTES) {
    throw new ZipImportError(
      "too-large",
      "This ZIP file is too large to process in the browser."
    );
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new ZipImportError(
      "invalid-zip",
      "This does not look like a valid ZIP file."
    );
  }

  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length === 0) {
    throw new ZipImportError("invalid-zip", "The ZIP file is empty.");
  }

  const chatEntry = entries.find((entry) => looksLikeChatFile(entry.name));
  if (!chatEntry) {
    throw new ZipImportError(
      "no-chat",
      "Could not find a WhatsApp chat text file (_chat.txt) inside the ZIP."
    );
  }

  const chatText = await chatEntry.async("string");

  const mediaEntries = entries.filter((entry) => {
    const ext = getExtension(entry.name);
    return MEDIA_EXTENSIONS.includes(ext);
  });

  const mediaFiles: MediaFile[] = [];
  let processed = 0;
  for (const entry of mediaEntries) {
    const blob = await entry.async("blob");
    const ext = getExtension(entry.name);
    const filename = entry.name.split("/").pop() || entry.name;
    const url = URL.createObjectURL(blob);
    mediaFiles.push({
      filename,
      blob,
      url,
      type: mediaTypeForExtension(ext),
    });
    processed += 1;
    onProgress?.(Math.round((processed / Math.max(mediaEntries.length, 1)) * 100));
  }

  return { chatText, mediaFiles };
}

export function revokeMediaUrls(mediaFiles: MediaFile[]): void {
  for (const media of mediaFiles) {
    URL.revokeObjectURL(media.url);
  }
}
