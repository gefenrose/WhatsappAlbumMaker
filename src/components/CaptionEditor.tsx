import { useState } from "react";
import type { Language } from "../types";
import { t } from "../lib/i18n";

type CaptionEditorProps = {
  value: string;
  language: Language;
  onSave: (value: string) => void;
  onCancel: () => void;
};

export function CaptionEditor({ value, language, onSave, onCancel }: CaptionEditorProps) {
  const [draft, setDraft] = useState(value);

  return (
    <div className="caption-editor">
      <textarea
        className="caption-editor__textarea"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={3}
        autoFocus
      />
      <div className="caption-editor__actions">
        <button type="button" className="button button--primary" onClick={() => onSave(draft.trim())}>
          {t(language, "save")}
        </button>
        <button type="button" className="button button--ghost" onClick={onCancel}>
          {t(language, "cancel")}
        </button>
      </div>
    </div>
  );
}
