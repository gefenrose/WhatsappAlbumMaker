import { useEffect } from "react";
import type { AlbumItem, Language } from "../types";
import { t } from "../lib/i18n";

type LightboxProps = {
  item: AlbumItem;
  language: Language;
  hasPrev: boolean;
  hasNext: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export function Lightbox({ item, language, hasPrev, hasNext, onClose, onPrev, onNext }: LightboxProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && hasNext) onNext();
      if (event.key === "ArrowLeft" && hasPrev) onPrev();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNext, onPrev, hasNext, hasPrev]);

  const dateTime = [item.dateRaw, item.timeRaw].filter(Boolean).join(" · ");
  const hasCaptionPanel = Boolean(dateTime || item.sender || item.caption);

  return (
    <div className="lightbox no-print" role="dialog" aria-modal="true" onClick={onClose}>
      <button type="button" className="lightbox__close" onClick={onClose} aria-label={t(language, "closeLightbox")}>
        ✕
      </button>

      {hasPrev && (
        <button
          type="button"
          className="lightbox__nav lightbox__nav--prev"
          onClick={(event) => {
            event.stopPropagation();
            onPrev();
          }}
          aria-label={t(language, "previousPhoto")}
        >
          ‹
        </button>
      )}

      <div className="lightbox__content" onClick={(event) => event.stopPropagation()}>
        <img className="lightbox__image" src={item.media.url} alt={item.caption || item.media.filename} />
        {hasCaptionPanel && (
          <div className="lightbox__caption">
            {dateTime && <p className="lightbox__datetime">{dateTime}</p>}
            {item.sender && <p className="lightbox__sender">{item.sender}</p>}
            {item.caption && <p className="lightbox__text">{item.caption}</p>}
          </div>
        )}
      </div>

      {hasNext && (
        <button
          type="button"
          className="lightbox__nav lightbox__nav--next"
          onClick={(event) => {
            event.stopPropagation();
            onNext();
          }}
          aria-label={t(language, "nextPhoto")}
        >
          ›
        </button>
      )}
    </div>
  );
}
