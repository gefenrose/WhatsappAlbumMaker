import { useRef, useState } from "react";
import type { DragEvent } from "react";
import type { Language } from "../types";
import { t } from "../lib/i18n";

type ZipImporterProps = {
  language: Language;
  onFileSelected: (file: File) => void;
  disabled?: boolean;
};

export function ZipImporter({ language, onFileSelected, disabled }: ZipImporterProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!disabled) setIsDragActive(true);
  }

  function handleDragLeave() {
    setIsDragActive(false);
  }

  function handleInputChange() {
    const file = inputRef.current?.files?.[0];
    if (file) onFileSelected(file);
  }

  return (
    <div
      className={`drop-zone${isDragActive ? " drop-zone--active" : ""}${
        disabled ? " drop-zone--disabled" : ""
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
      }}
    >
      <div className="drop-zone__icon" aria-hidden="true">
        📷
      </div>
      <p className="drop-zone__title">{t(language, "dropZoneTitle")}</p>
      <p className="drop-zone__subtitle">{t(language, "dropZoneSubtitle")}</p>
      <button
        type="button"
        className="button button--primary"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          inputRef.current?.click();
        }}
      >
        {t(language, "chooseFile")}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        className="visually-hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />
    </div>
  );
}
