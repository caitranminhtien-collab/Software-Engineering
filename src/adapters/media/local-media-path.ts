/**
 * Chỉ chấp nhận đường dẫn media local có:
 * - Một thư mục ID di tích hợp lệ.
 * - Một tên file an toàn.
 * - Phần mở rộng được middleware hỗ trợ.
 */
export function isLocalMediaPath(
  value: string
): boolean {
  const matched =
    /^\/uploads\/media\/([1-9]\d{0,17})\/([A-Za-z0-9][A-Za-z0-9_.-]{0,127})$/.exec(
      value
    );

  if (!matched) {
    return false;
  }

  const attractionId = Number(matched[1]);
  const filename = matched[2];

  return (
    Number.isSafeInteger(attractionId) &&
    !filename.includes("..") &&
    /\.(?:jpg|jpeg|png|gif|webp|mp3|wav)$/i.test(filename)
  );
}