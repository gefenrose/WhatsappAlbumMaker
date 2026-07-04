/** Keeps Unicode (e.g. Hebrew) titles intact for a downloaded filename,
 * only stripping characters that are illegal on common filesystems. */
export function sanitizeDownloadFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  return cleaned || "digital-album";
}
