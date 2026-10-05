// 圖片壓縮：長邊最大 1280 px、JPEG 品質 0.8，並依 EXIF 方向轉正。
const MAX_EDGE = 1280;
const QUALITY = 0.8;

const isHeic = (file) => /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);

async function decode(file) {
  // imageOrientation: 'from-image' 會自動套用 EXIF 方向
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch { /* 改用 <img> 解碼 */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressImage(file, maxEdge = MAX_EDGE) {
  let img;
  try {
    img = await decode(file);
  } catch {
    throw new Error(isHeic(file)
      ? '這張照片是 HEIC 格式，瀏覽器無法讀取。請改選其他照片，或到 iPhone「設定 → 相機 → 格式」改為「最相容」。'
      : '無法讀取這張圖片，請換一張試試。');
  }
  const w = img.width;
  const h = img.height;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; // 透明 PNG 轉 JPEG 時墊白底
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  if (!blob) throw new Error('圖片壓縮失敗，請換一張試試。');
  return blob;
}
