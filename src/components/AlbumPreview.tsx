import { useState } from "react";
import type { AlbumFilter, AlbumItem, Language, VisibleFields } from "../types";
import { t } from "../lib/i18n";
import { AlbumCard } from "./AlbumCard";
import { Lightbox } from "./Lightbox";

type AlbumPreviewProps = {
  items: AlbumItem[];
  filter: AlbumFilter;
  senderFilter: string[];
  includeVideos: boolean;
  visibleFields: VisibleFields;
  language: Language;
  selectedIds: Set<string>;
  onCaptionChange: (id: string, caption: string) => void;
  onToggleSelect: (id: string) => void;
};

export function filterAlbumItems(
  items: AlbumItem[],
  filter: AlbumFilter,
  senderFilter: string[],
  includeVideos: boolean
): AlbumItem[] {
  return items.filter((item) => {
    if (!includeVideos && item.media.type === "video") return false;
    if (senderFilter.length > 0 && (!item.sender || !senderFilter.includes(item.sender))) return false;
    if (filter === "with-caption") return item.caption.trim() !== "";
    if (filter === "missing-caption") return item.caption.trim() === "";
    return true;
  });
}

export function AlbumPreview({
  items,
  filter,
  senderFilter,
  includeVideos,
  visibleFields,
  language,
  selectedIds,
  onCaptionChange,
  onToggleSelect,
}: AlbumPreviewProps) {
  const [lightboxItemId, setLightboxItemId] = useState<string | null>(null);

  const visibleItems = filterAlbumItems(items, filter, senderFilter, includeVideos);
  // Only photos open in the lightbox; videos already have native fullscreen controls.
  const photoItems = visibleItems.filter((item) => item.media.type === "image");
  const lightboxIndex = photoItems.findIndex((item) => item.id === lightboxItemId);
  const lightboxItem = lightboxIndex === -1 ? null : photoItems[lightboxIndex];

  if (visibleItems.length === 0) {
    return <p className="empty-state">{t(language, "emptyState")}</p>;
  }

  return (
    <div className="album-grid">
      {visibleItems.map((item) => (
        <AlbumCard
          key={item.id}
          item={item}
          language={language}
          selected={selectedIds.has(item.id)}
          visibleFields={visibleFields}
          onCaptionChange={onCaptionChange}
          onToggleSelect={onToggleSelect}
          onOpenLightbox={setLightboxItemId}
        />
      ))}

      {lightboxItem && (
        <Lightbox
          item={lightboxItem}
          language={language}
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < photoItems.length - 1}
          onClose={() => setLightboxItemId(null)}
          onPrev={() => setLightboxItemId(photoItems[lightboxIndex - 1].id)}
          onNext={() => setLightboxItemId(photoItems[lightboxIndex + 1].id)}
        />
      )}
    </div>
  );
}
