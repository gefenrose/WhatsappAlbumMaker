import { useState } from "react";
import type { AlbumItem, Language } from "../types";
import { t, type TranslationKey } from "../lib/i18n";
import { CaptionEditor } from "./CaptionEditor";

type AlbumCardProps = {
  item: AlbumItem;
  language: Language;
  selected: boolean;
  onCaptionChange: (id: string, caption: string) => void;
  onToggleSelect: (id: string) => void;
};

const CONFIDENCE_LABEL: Record<AlbumItem["confidence"], TranslationKey> = {
  high: "confidenceHigh",
  medium: "confidenceMedium",
  low: "confidenceLow",
};

export function AlbumCard({ item, language, selected, onCaptionChange, onToggleSelect }: AlbumCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  const dateTime = [item.dateRaw, item.timeRaw].filter(Boolean).join(" · ");

  return (
    <article className={`album-card${selected ? " album-card--selected" : ""}`}>
      <div className="album-card__photo-wrap">
        <img
          className="album-card__photo"
          src={item.media.url}
          alt={item.caption || item.media.filename}
          loading="lazy"
        />
        <label className="album-card__select no-print">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            aria-label={t(language, "selectPhoto")}
          />
        </label>
        {item.confidence !== "high" && (
          <span className={`badge badge--${item.confidence}`}>
            {t(language, CONFIDENCE_LABEL[item.confidence])}
          </span>
        )}
      </div>
      <div className="album-card__body">
        {dateTime && <p className="album-card__datetime">{dateTime}</p>}
        {item.sender && <p className="album-card__sender">{item.sender}</p>}

        {isEditing ? (
          <CaptionEditor
            value={item.caption}
            language={language}
            onSave={(value) => {
              onCaptionChange(item.id, value);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <button
            type="button"
            className="album-card__caption-button"
            onClick={() => setIsEditing(true)}
            aria-label={t(language, "editCaption")}
          >
            <p className={`album-card__caption${item.caption ? "" : " album-card__caption--empty"}`}>
              {item.caption || t(language, "noCaption")}
            </p>
          </button>
        )}
      </div>
    </article>
  );
}
