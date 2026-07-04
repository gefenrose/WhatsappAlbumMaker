export type ChatMessage = {
  id: string;
  dateRaw: string;
  timeRaw: string;
  timestamp?: Date;
  sender?: string;
  text: string;
  mediaFilenames: string[];
  isSystemMessage?: boolean;
};

export type MediaFile = {
  filename: string;
  blob: Blob;
  url: string;
  type: "image" | "video" | "other";
};

export type AlbumItem = {
  id: string;
  media: MediaFile;
  dateRaw: string;
  timeRaw: string;
  sender?: string;
  caption: string;
  sourceMessageId?: string;
  confidence: "high" | "medium" | "low";
};

export type Language = "en" | "he";

export type AlbumFilter = "all" | "with-caption" | "missing-caption";

export type VisibleFields = {
  date: boolean;
  time: boolean;
  sender: boolean;
  caption: boolean;
};
