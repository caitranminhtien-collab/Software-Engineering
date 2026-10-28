import {
  isLocalMediaPath,
} from "./local-media-path";

export function resolveMediaUrl(
  fileUrl: string
): string {
  const legacyOrigins =
    (process.env.MEDIA_LEGACY_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

  try {
    const parsedUrl = new URL(fileUrl);

    const isLegacyLocalMedia =
      legacyOrigins.includes(parsedUrl.origin) &&
      isLocalMediaPath(parsedUrl.pathname) &&
      !parsedUrl.search &&
      !parsedUrl.hash &&
      !parsedUrl.username &&
      !parsedUrl.password;

    if (isLegacyLocalMedia) {
      return parsedUrl.pathname;
    }
  } catch {
    // Giữ nguyên đường dẫn tương đối.
  }

  return fileUrl;
}