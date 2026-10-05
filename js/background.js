import { getSettings, getImageUrl } from './store.js';

// 把自訂背景圖套到整個 App（沒有設定時還原預設）
export async function applyBackground() {
  const { background_path } = await getSettings();
  const url = await getImageUrl(background_path);
  document.documentElement.style.setProperty('--bg-image', url ? `url("${url}")` : 'none');
}
