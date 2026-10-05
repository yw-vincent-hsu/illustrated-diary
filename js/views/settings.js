import * as store from '../store.js';
import { compressImage } from '../image.js';
import { applyBackground } from '../background.js';

const BG_PATH = 'background.jpg';

export async function render(el) {
  el.innerHTML = `
    <h1>設定</h1>
    <section class="block">
      <h2>背景圖</h2>
      <p class="muted">選一張照片當作整個 App 的背景，文字上會自動疊一層淡色遮罩，確保讀得清楚。</p>
      <div class="preview" id="bgPreview"></div>
      <div class="row">
        <label class="btn">選擇背景圖<input class="sr-only" type="file" accept="image/*" id="bgFile"></label>
        <button class="btn" type="button" id="bgReset" hidden>還原預設</button>
      </div>
      <p class="status" id="msg" role="status"></p>
    </section>
    <section class="block">
      <h2>資料儲存</h2>
      <p class="muted">目前日記只存在這支手機的瀏覽器裡。清除 Safari 網站資料或移除主畫面 App 會一併刪掉，重要的內容請先不要只放在這裡。</p>
    </section>
  `;

  const $ = (sel) => el.querySelector(sel);
  const msg = $('#msg');

  async function refresh() {
    const { background_path } = await store.getSettings();
    const url = await store.getImageUrl(background_path);
    const box = $('#bgPreview');
    box.replaceChildren();
    box.classList.toggle('empty', !url);
    if (url) {
      const img = new Image();
      img.src = url;
      img.alt = '目前的背景圖';
      box.append(img);
    } else {
      box.textContent = '目前使用預設背景。';
    }
    $('#bgReset').hidden = !url;
  }

  $('#bgFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    msg.classList.remove('error');
    msg.textContent = '處理中…';
    try {
      const blob = await compressImage(file, 1600);
      await store.putImage(BG_PATH, blob);
      await store.saveSettings({ background_path: BG_PATH });
      await applyBackground();
      msg.textContent = '背景已更新。';
      refresh();
    } catch (err) {
      msg.classList.add('error');
      msg.textContent = err.message;
    }
  });

  $('#bgReset').addEventListener('click', async () => {
    await store.deleteImage(BG_PATH);
    await store.saveSettings({ background_path: null });
    await applyBackground();
    msg.classList.remove('error');
    msg.textContent = '已還原預設背景。';
    refresh();
  });

  refresh();
}
