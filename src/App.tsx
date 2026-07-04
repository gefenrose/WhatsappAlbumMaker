import { useEffect, useMemo, useRef, useState } from "react";
import type { AlbumFilter, AlbumItem, Language, MediaFile, VisibleFields } from "./types";
import { deriveAlbumNameFromZipFilename, extractWhatsAppZip, revokeMediaUrls, ZipImportError } from "./lib/zipUtils";
import { extractGroupName, parseWhatsAppChat } from "./lib/parseWhatsAppChat";
import { buildAlbumItems } from "./lib/buildAlbumItems";
import { t, isRtl, type TranslationKey } from "./lib/i18n";
import { ZipImporter } from "./components/ZipImporter";
import { Toolbar } from "./components/Toolbar";
import { AlbumPreview, filterAlbumItems } from "./components/AlbumPreview";
import "./styles.css";

type Status = "idle" | "loading" | "ready" | "error";

type UndoState = {
  previousItems: AlbumItem[];
  count: number;
};

const UNDO_TIMEOUT_MS = 8000;
const DEFAULT_VISIBLE_FIELDS: VisibleFields = { date: true, time: true, sender: true, caption: true };

const EXPORT_STEP_KEYS: TranslationKey[] = [
  "exportStep1",
  "exportStep2",
  "exportStep3",
  "exportStep4",
  "exportStep5",
  "exportStep6",
];

function App() {
  const [language, setLanguage] = useState<Language>("he");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [albumItems, setAlbumItems] = useState<AlbumItem[]>([]);
  const [albumName, setAlbumName] = useState("");
  const [filter, setFilter] = useState<AlbumFilter>("all");
  const [senderFilter, setSenderFilter] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [includeVideos, setIncludeVideos] = useState(false);
  const [visibleFields, setVisibleFields] = useState<VisibleFields>(DEFAULT_VISIBLE_FIELDS);

  const mediaFilesRef = useRef<MediaFile[]>([]);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.documentElement.dir = isRtl(language) ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    return () => {
      revokeMediaUrls(mediaFilesRef.current);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  // Selecting items only makes sense for what's currently visible; drop the
  // selection whenever the visible set changes underneath it.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filter, senderFilter]);

  const rtl = isRtl(language);

  const senders = useMemo(() => {
    const unique = new Set<string>();
    for (const item of albumItems) {
      if (item.sender) unique.add(item.sender);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [albumItems]);

  const visibleItems = useMemo(
    () => filterAlbumItems(albumItems, filter, senderFilter, includeVideos),
    [albumItems, filter, senderFilter, includeVideos]
  );

  const hasVideos = useMemo(() => albumItems.some((item) => item.media.type === "video"), [albumItems]);

  async function handleFileSelected(file: File) {
    setStatus("loading");
    setErrorMessage(null);
    setProgress(0);

    try {
      const { chatText, mediaFiles } = await extractWhatsAppZip(file, setProgress);

      const imageCount = mediaFiles.filter((media) => media.type === "image").length;
      if (imageCount === 0) {
        revokeMediaUrls(mediaFiles);
        setStatus("error");
        setErrorMessage(t(language, "errorNoMedia"));
        return;
      }

      const messages = parseWhatsAppChat(chatText);
      if (messages.length === 0) {
        revokeMediaUrls(mediaFiles);
        setStatus("error");
        setErrorMessage(t(language, "errorParseFailed"));
        return;
      }

      const items = buildAlbumItems(messages, mediaFiles);

      revokeMediaUrls(mediaFilesRef.current);
      mediaFilesRef.current = mediaFiles;

      setAlbumItems(items);
      setAlbumName(extractGroupName(messages) ?? deriveAlbumNameFromZipFilename(file.name) ?? t(language, "appTitle"));
      setFilter("all");
      setSenderFilter([]);
      setSelectedIds(new Set());
      setIncludeVideos(false);
      setVisibleFields(DEFAULT_VISIBLE_FIELDS);
      clearUndo();
      setStatus("ready");
    } catch (error) {
      if (error instanceof ZipImportError) {
        const key = error.code === "no-chat" ? "errorNoChat" : "errorInvalidZip";
        setErrorMessage(t(language, key));
      } else {
        setErrorMessage(t(language, "errorParseFailed"));
      }
      setStatus("error");
    }
  }

  function handleNewImport() {
    revokeMediaUrls(mediaFilesRef.current);
    mediaFilesRef.current = [];
    setAlbumItems([]);
    setAlbumName("");
    setStatus("idle");
    setErrorMessage(null);
    setFilter("all");
    setSenderFilter([]);
    setExportError(null);
    setSelectedIds(new Set());
    setIncludeVideos(false);
    setVisibleFields(DEFAULT_VISIBLE_FIELDS);
    clearUndo();
  }

  function handleCaptionChange(id: string, caption: string) {
    setAlbumItems((prev) => prev.map((item) => (item.id === id ? { ...item, caption } : item)));
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleToggleField(field: keyof VisibleFields) {
    setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  function handleToggleSender(sender: string) {
    setSenderFilter((prev) => (prev.includes(sender) ? prev.filter((s) => s !== sender) : [...prev, sender]));
  }

  function clearUndo() {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setUndoState(null);
  }

  function handleDeleteSelected() {
    if (selectedIds.size === 0) return;

    setUndoState({ previousItems: albumItems, count: selectedIds.size });
    setAlbumItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
    setSelectedIds(new Set());

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoState(null), UNDO_TIMEOUT_MS);
  }

  function handleUndo() {
    if (!undoState) return;
    setAlbumItems(undoState.previousItems);
    clearUndo();
  }

  async function handleExportDigitalAlbum() {
    setExporting(true);
    setExportError(null);
    try {
      const { exportDigitalAlbum } = await import("./lib/exportDigitalAlbum");
      await exportDigitalAlbum(visibleItems, {
        title: albumName || t(language, "appTitle"),
        rtl,
        language,
        noCaptionLabel: t(language, "noCaption"),
        visibleFields,
        lightboxLabels: {
          close: t(language, "closeLightbox"),
          previous: t(language, "previousPhoto"),
          next: t(language, "nextPhoto"),
        },
      });
    } catch {
      setExportError(t(language, "exportError"));
    } finally {
      setExporting(false);
    }
  }

  async function handleExportWord() {
    setExporting(true);
    setExportError(null);
    try {
      const { exportAlbumAsWord } = await import("./lib/exportWord");
      await exportAlbumAsWord(visibleItems, {
        title: albumName || t(language, "appTitle"),
        rtl,
        noCaptionLabel: t(language, "noCaption"),
        videoLabel: t(language, "videoLabel"),
        visibleFields,
      });
    } catch {
      setExportError(t(language, "exportError"));
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPowerPoint() {
    setExporting(true);
    setExportError(null);
    try {
      const { exportAlbumAsPowerPoint } = await import("./lib/exportPowerPoint");
      await exportAlbumAsPowerPoint(visibleItems, {
        title: albumName || t(language, "appTitle"),
        rtl,
        language,
        noCaptionLabel: t(language, "noCaption"),
        videoLabel: t(language, "videoLabel"),
        visibleFields,
      });
    } catch {
      setExportError(t(language, "exportError"));
    } finally {
      setExporting(false);
    }
  }

  const showImporter = status === "idle" || status === "loading" || status === "error";

  return (
    <div className="app">
      <header className="app__header no-print">
        <h1 className="app__title">{t(language, "appTitle")}</h1>
        <p className="app__tagline">{t(language, "tagline")}</p>
        <p className="privacy-notice">{t(language, "privacyNotice")}</p>
        <button
          type="button"
          className="button button--ghost language-toggle"
          onClick={() => setLanguage(language === "he" ? "en" : "he")}
          aria-label={t(language, "languageLabel")}
        >
          {language === "he" ? "English" : "עברית"}
        </button>
      </header>

      {showImporter && (
        <main className="app__main">
          <ZipImporter language={language} onFileSelected={handleFileSelected} disabled={status === "loading"} />
          {status === "loading" && (
            <p className="status-text" role="status">
              {t(language, "processing")} {progress > 0 ? `${progress}%` : ""}
            </p>
          )}
          {status === "error" && errorMessage && <p className="status-text status-text--error">{errorMessage}</p>}

          <section className="export-instructions">
            <h2 className="export-instructions__title">{t(language, "howToExportTitle")}</h2>
            <ol className="export-instructions__list">
              {EXPORT_STEP_KEYS.map((key) => (
                <li key={key}>{t(language, key)}</li>
              ))}
            </ol>
            <p className="export-instructions__note">{t(language, "exportScopeNote")}</p>
          </section>
        </main>
      )}

      {status === "ready" && (
        <>
          <Toolbar
            language={language}
            filter={filter}
            onFilterChange={setFilter}
            senders={senders}
            senderFilter={senderFilter}
            onToggleSender={handleToggleSender}
            onClearSenderFilter={() => setSenderFilter([])}
            visibleCount={visibleItems.length}
            totalCount={albumItems.length}
            onExportDigitalAlbum={handleExportDigitalAlbum}
            onExportWord={handleExportWord}
            onExportPowerPoint={handleExportPowerPoint}
            exporting={exporting}
            exportError={exportError}
            onNewImport={handleNewImport}
            selectedCount={selectedIds.size}
            onDeleteSelected={handleDeleteSelected}
            hasVideos={hasVideos}
            includeVideos={includeVideos}
            onIncludeVideosChange={setIncludeVideos}
            visibleFields={visibleFields}
            onToggleField={handleToggleField}
          />
          <main className="app__main">
            <AlbumPreview
              items={albumItems}
              filter={filter}
              senderFilter={senderFilter}
              includeVideos={includeVideos}
              visibleFields={visibleFields}
              language={language}
              selectedIds={selectedIds}
              onCaptionChange={handleCaptionChange}
              onToggleSelect={handleToggleSelect}
            />
          </main>
        </>
      )}

      {undoState && (
        <div className="undo-toast no-print" role="status">
          <span>
            {t(language, "deletedMessagePrefix")} {undoState.count} {t(language, "photoCount")}
          </span>
          <button type="button" className="button button--ghost undo-toast__button" onClick={handleUndo}>
            {t(language, "undo")}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
