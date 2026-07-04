import type { AlbumFilter, Language } from "../types";
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
  onPrint: () => void;
  onExportPptx: () => void;
  exporting: boolean;
  exportError: string | null;
  onNewImport: () => void;
  selectedCount: number;
  onDeleteSelected: () => void;
};

const FILTERS: { value: AlbumFilter; labelKey: "filterAll" | "filterWithCaption" | "filterMissingCaption" }[] = [
  { value: "all", labelKey: "filterAll" },
  { value: "with-caption", labelKey: "filterWithCaption" },
  { value: "missing-caption", labelKey: "filterMissingCaption" },
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
  onPrint,
  onExportPptx,
  exporting,
  exportError,
  onNewImport,
  selectedCount,
  onDeleteSelected,
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
          <button type="button" className="button button--secondary" onClick={onPrint}>
            {t(language, "print")}
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={onExportPptx}
            disabled={exporting}
          >
            {exporting ? t(language, "exporting") : t(language, "exportPptx")}
          </button>
        </div>
      </div>

      {exportError && <p className="toolbar__error">{exportError}</p>}
    </div>
  );
}
