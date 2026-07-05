/** Keeps Unicode (e.g. Hebrew) titles intact for a downloaded filename,
 * only stripping characters that are illegal on common filesystems. */
export function sanitizeDownloadFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  return cleaned || "digital-album";
}

/** Strips a media filename down to safe ASCII characters for use inside a
 * zip's media/ folder and as part of a relative hyperlink. */
export function sanitizeMediaFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "media";
}

/** Keeps generated filenames unique inside a shared media/ folder. */
export function uniqueFilename(desired: string, used: Set<string>): string {
  if (!used.has(desired)) {
    used.add(desired);
    return desired;
  }
  const dotIndex = desired.lastIndexOf(".");
  const base = dotIndex === -1 ? desired : desired.slice(0, dotIndex);
  const ext = dotIndex === -1 ? "" : desired.slice(dotIndex);
  let counter = 1;
  let candidate = `${base}-${counter}${ext}`;
  while (used.has(candidate)) {
    counter += 1;
    candidate = `${base}-${counter}${ext}`;
  }
  used.add(candidate);
  return candidate;
}
