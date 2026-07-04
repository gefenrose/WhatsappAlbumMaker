import type { AlbumFilter, Language, VisibleFields } from "../types";
import { t } from "../lib/i18n";

type ToolbarProps = {
  language: Language;
  filter: AlbumFilter;
  onFilterChange: (filter: AlbumFilter) => void;
  senders: string[];
  senderFilter: string | null;
  onSenderFilterChange: (sender: string | null) => void;
  visibleCount: number;
  totalCount: number;
  onExportDigitalAlbum: () => void;
  exporting: boolean;
  exportError: string | null;
  onNewImport: () => void;
  selectedCount: number;
  onDeleteSelected: () => void;
  hasVideos: boolean;
  includeVideos: boolean;
  onIncludeVideosChange: (value: boolean) => void;
  visibleFields: VisibleFields;
  onToggleField: (field: keyof VisibleFields) => void;
};

const FILTERS: { value: AlbumFilter; labelKey: "filterAll" | "filterWithCaption" | "filterMissingCaption" }[] = [
  { value: "all", labelKey: "filterAll" },
  { value: "with-caption", labelKey: "filterWithCaption" },
  { value: "missing-caption", labelKey: "filterMissingCaption" },
];

const FIELD_TOGGLES: { field: keyof VisibleFields; labelKey: "showDate" | "showTime" | "showSender" | "showCaption" }[] = [
  { field: "date", labelKey: "showDate" },
  { field: "time", labelKey: "showTime" },
  { field: "sender", labelKey: "showSender" },
  { field: "caption", labelKey: "showCaption" },
];

export function Toolbar({
  language,
  filter,
  onFilterChange,
  senders,
  senderFilter,
  onSenderFilterChange,
  visibleCount,
  totalCount,
  onExportDigitalAlbum,
  exporting,
  exportError,
  onNewImport,
  selectedCount,
  onDeleteSelected,
  hasVideos,
  includeVideos,
  onIncludeVideosChange,
  visibleFields,
  onToggleField,
}: ToolbarProps) {
  return (
    <div className="toolbar no-print">
      <div className="toolbar__row">
        <div className="toolbar__filters">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`chip${filter === option.value ? " chip--active" : ""}`}
              onClick={() => onFilterChange(option.value)}
            >
              {t(language, option.labelKey)}
            </button>
          ))}

          {senders.length > 1 && (
            <select
              className="select"
              value={senderFilter ?? ""}
              onChange={(event) => onSenderFilterChange(event.target.value || null)}
              aria-label={t(language, "filterBySender")}
            >
              <option value="">{t(language, "allSenders")}</option>
              {senders.map((sender) => (
                <option key={sender} value={sender}>
                  {sender}
                </option>
              ))}
            </select>
          )}

          {hasVideos && (
            <label className="checkbox-toggle">
              <input
                type="checkbox"
                checked={includeVideos}
                onChange={(event) => onIncludeVideosChange(event.target.checked)}
              />
              {t(language, "includeVideos")}
            </label>
          )}
        </div>
      </div>

      <div className="toolbar__row">
        <div className="toolbar__field-toggles">
          <span className="toolbar__field-toggles-label">{t(language, "showFieldsLabel")}</span>
          {FIELD_TOGGLES.map(({ field, labelKey }) => (
            <label key={field} className="checkbox-toggle">
              <input
                type="checkbox"
                checked={visibleFields[field]}
                onChange={() => onToggleField(field)}
              />
              {t(language, labelKey)}
            </label>
          ))}
        </div>
      </div>

      <div className="toolbar__row">
        <p className="toolbar__count">
          {t(language, "itemsShown")} {visibleCount} {t(language, "of")} {totalCount} {t(language, "photoCount")}
        </p>

        <div className="toolbar__actions">
          {selectedCount > 0 && (
            <button type="button" className="button button--danger" onClick={onDeleteSelected}>
              {t(language, "deleteSelected")} ({selectedCount})
            </button>
          )}
          <button type="button" className="button button--ghost" onClick={onNewImport}>
            {t(language, "newImport")}
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={onExportDigitalAlbum}
            disabled={exporting}
          >
            {exporting ? t(language, "exporting") : t(language, "exportDigitalAlbum")}
          </button>
        </div>
      </div>

      {exportError && <p className="toolbar__error">{exportError}</p>}
    </div>
  );
}
