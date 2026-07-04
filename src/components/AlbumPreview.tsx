import type { AlbumFilter, AlbumItem, Language, VisibleFields } from "../types";
import { t } from "../lib/i18n";
import { AlbumCard } from "./AlbumCard";

type AlbumPreviewProps = {
  items: AlbumItem[];
  filter: AlbumFilter;
  senderFilter: string | null;
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
  senderFilter: string | null,
  includeVideos: boolean
): AlbumItem[] {
  return items.filter((item) => {
    if (!includeVideos && item.media.type === "video") return false;
    if (senderFilter && item.sender !== senderFilter) return false;
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
  const visibleItems = filterAlbumItems(items, filter, senderFilter, includeVideos);

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
        />
      ))}
    </div>
  );
}
