import type { AlbumItem, ChatMessage, MediaFile } from "../types";
import { normalizeFilename } from "./parseWhatsAppChat";

const NEARBY_WINDOW_OFFSETS = [1, -1, 2, -2];

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `album-${idCounter}-${Date.now().toString(36)}`;
}

function findMediaFile(
  filename: string,
  mediaByName: Map<string, MediaFile>
): MediaFile | undefined {
  const normalized = normalizeFilename(filename).toLowerCase();
  if (mediaByName.has(normalized)) return mediaByName.get(normalized);
  // Fallback: match ignoring extension case differences already handled by
  // lowercasing above; nothing further to try.
  return undefined;
}

/**
 * Looks at messages near `index` (same sender, real text, no attachments of
 * its own) to use as a caption when the media message itself has no text.
 */
function findNearbyCaption(
  messages: ChatMessage[],
  index: number,
  sender: string | undefined
): ChatMessage | undefined {
  for (const offset of NEARBY_WINDOW_OFFSETS) {
    const candidate = messages[index + offset];
    if (!candidate) continue;
    if (candidate.isSystemMessage) continue;
    if (candidate.mediaFilenames.length > 0) continue;
    if (candidate.text.trim() === "") continue;
    if (sender && candidate.sender !== sender) continue;
    return candidate;
  }
  return undefined;
}

export function buildAlbumItems(
  messages: ChatMessage[],
  mediaFiles: MediaFile[]
): AlbumItem[] {
  const mediaByName = new Map<string, MediaFile>();
  for (const media of mediaFiles) {
    mediaByName.set(normalizeFilename(media.filename).toLowerCase(), media);
  }

  const usedFilenames = new Set<string>();
  const items: AlbumItem[] = [];

  messages.forEach((message, index) => {
    for (const rawFilename of message.mediaFilenames) {
      const media = findMediaFile(rawFilename, mediaByName);
      if (!media) continue;

      usedFilenames.add(normalizeFilename(media.filename).toLowerCase());

      if (media.type !== "image") continue;

      if (message.text.trim() !== "") {
        items.push({
          id: nextId(),
          media,
          dateRaw: message.dateRaw,
          timeRaw: message.timeRaw,
          sender: message.sender,
          caption: message.text.trim(),
          sourceMessageId: message.id,
          confidence: "high",
        });
        continue;
      }

      const nearby = findNearbyCaption(messages, index, message.sender);
      if (nearby) {
        items.push({
          id: nextId(),
          media,
          dateRaw: message.dateRaw,
          timeRaw: message.timeRaw,
          sender: message.sender,
          caption: nearby.text.trim(),
          sourceMessageId: nearby.id,
          confidence: "medium",
        });
        continue;
      }

      items.push({
        id: nextId(),
        media,
        dateRaw: message.dateRaw,
        timeRaw: message.timeRaw,
        sender: message.sender,
        caption: "",
        sourceMessageId: message.id,
        confidence: "low",
      });
    }
  });

  // Any image files not referenced by any parsed message still make it into
  // the album so the user can caption them manually.
  for (const media of mediaFiles) {
    const key = normalizeFilename(media.filename).toLowerCase();
    if (usedFilenames.has(key)) continue;
    if (media.type !== "image") continue;
    items.push({
      id: nextId(),
      media,
      dateRaw: "",
      timeRaw: "",
      sender: undefined,
      caption: "",
      confidence: "low",
    });
  }

  return items;
}
