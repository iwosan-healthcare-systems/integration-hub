// Downscales + recompresses an image in the browser before upload, so large
// phone/DSLR photos (10-20MB+) don't hit the server's size limit or blow up
// Postgres row sizes. GIFs are left untouched to preserve animation.

const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.82;
const WEBP_QUALITY = 0.82;

export async function compressImageFile(file: File): Promise<File> {
  if (file.type === "image/gif") return file;

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // PNG stays lossless (transparency-safe) — the dimension cap alone still
  // shrinks huge screenshots/graphics considerably.
  const outType = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
  const quality = outType === "image/png" ? undefined : outType === "image/webp" ? WEBP_QUALITY : JPEG_QUALITY;

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outType, quality));
  if (!blob || blob.size >= file.size) return file;

  const ext = outType === "image/png" ? "png" : outType === "image/webp" ? "webp" : "jpg";
  return new File([blob], file.name.replace(/\.\w+$/, `.${ext}`), { type: outType });
}
