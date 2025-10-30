// src/utils.ts
export function toFolderBase(name: string) {
  // replace whitespace with underscore, drop non-url-safe chars
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

export function fileSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function buildCdnUrl(cdnBase: string, path: string) {
  // path like "photos/thirukoneswaram_001/thirukoneswaram-temple-2.jpg"
  return (cdnBase.endsWith("/") ? cdnBase : cdnBase + "/") + path;
}
