import * as store from '../store.js';
import { compressImage } from '../image.js';
import { generateImage } from '../ai.js';
import { todayTW } from '../util.js';

// 撰寫 / 編輯頁。路由 #/write 為新增，#/entry/:id 為編輯。
export async function render(el, params = []) {
  const editId = location.hash.startsWith('#/entry/') ? params[0] : null;
  const entry = editId ? await store.getEntry(editId) : null;

  if (editId && !entry) {
    el.innerHTML = '<h1>找不到這篇日記</h1><p><a href="#/write">回到寫日記</a></p>';
    return;
  }

  el.innerHTML = `
    <h1>${entry ? '編輯日記' : '寫日記'}</h1>
    <form id="form" autocomplete="off">
      <label class="field">日期
        <input type="date" name="date" required>
      </label>
      <label class="field">標題（選填）
        <input type="text" name="title" maxlength="100">
      </label>
      <label class="field">內容
        <textarea name="content" rows="9" required></textarea>
      </label>
      <div class="photo">
        <div class="preview" id="preview"></div>
        <div class="row">
          <label class="btn">選擇照片<input class="sr-only" type="file" accept="image/*" id="file"></label>
          <button class="btn" type="button" id="remove" hidden>移除照片</button>
        </div>
      </div>
      <p class="status" id="msg" role="status"></p>
      <button class="btn primary" type="submit" id="save">儲存</button>
    </form>
    <section id="dayList"></section>
  `;

  const $ = (sel) => el.querySelector(sel);
  const form = $('#form');
  const msg = $('#msg');
  const state = { newImage: null, newImageUrl: null, removed: false };

  form.date.value = entry?.entry_date ?? todayTW();
  form.title.value = entry?.title ?? '';
  form.content.value = entry?.content ?? '';

  const say = (text, isError = false) => {
    msg.textContent = text;
    msg.classList.toggle('error', isError);
  };

  // ---- 照片預覽 ----
  async function updatePreview() {
    const box = $('#preview');
    let url = state.newImageUrl;
    if (!url && entry?.image_path && !state.removed) url = await store.getImageUrl(entry.image_path);
    box.replaceChildren();
    if (url) {
      const img = new Image();
      img.src = url;
      img.alt = '日記配圖';
      box.append(img);
    } else {
      box.textContent = '沒有選照片時，儲存後會自動配一張圖。';
      box.classList.add('empty');
    }
    box.classList.toggle('empty', !url);
    // AI 配圖由內容決定，不提供移除；只有自己選的照片可以移除
    const isAi = !state.newImage && entry?.image_source === 'ai' && !state.removed;
    $('#remove').hidden = !url || isAi;
  }

  $('#file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    say('處理照片中…');
    try {
      const blob = await compressImage(file);
      if (state.newImageUrl) URL.revokeObjectURL(state.newImageUrl);
      state.newImage = blob;
      state.newImageUrl = URL.createObjectURL(blob);
      state.removed = false;
      say('');
      updatePreview();
    } catch (err) {
      say(err.message, true);
    }
  });

  $('#remove').addEventListener('click', () => {
    if (state.newImageUrl) URL.revokeObjectURL(state.newImageUrl);
    state.newImage = null;
    state.newImageUrl = null;
    state.removed = true;
    updatePreview();
  });

  // ---- 當天日記列表（僅新增模式）----
  async function refreshList() {
    const box = $('#dayList');
    if (entry) return;
    const list = await store.getEntriesByDate(form.date.value);
    box.replaceChildren();
    if (!list.length) return;
    const h = document.createElement('h2');
    h.textContent = `${form.date.value} 的日記`;
    box.append(h);
    for (const item of list) {
      const a = document.createElement('a');
      a.className = 'entry-item';
      a.href = `#/entry/${item.id}`;
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      store.getImageUrl(item.image_path).then((url) => {
        if (url) thumb.style.backgroundImage = `url("${url}")`;
      });
      const text = document.createElement('div');
      text.className = 'text';
      text.textContent = item.title || item.content.slice(0, 40);
      a.append(thumb, text);
      box.append(a);
    }
  }
  form.date.addEventListener('change', refreshList);

  // ---- 儲存 ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = form.content.value.trim();
    if (!content) return say('請先寫點內容。', true);
    const saveBtn = $('#save');
    saveBtn.disabled = true;
    say('儲存中…');
    try {
      await save(content);
    } catch (err) {
      console.error(err);
      say('儲存失敗，請再試一次。', true);
    } finally {
      saveBtn.disabled = false;
    }
  });

  async function save(content) {
    const settings = await store.getSettings();
    const next = {
      ...(entry ?? {}),
      id: entry?.id ?? crypto.randomUUID(),
      entry_date: form.date.value,
      title: form.title.value.trim() || null,
      content,
    };

    const textChanged = entry && (entry.content !== next.content || entry.title !== next.title);
    const dropOld = state.newImage || state.removed || (entry?.image_source === 'ai' && textChanged);

    if (state.newImage) {
      next.image_path = await store.uploadImage(next.id, state.newImage);
      Object.assign(next, { image_source: 'upload', image_status: 'done', image_prompt: null });
    } else if (dropOld && next.image_path) {
      await store.deleteImage(next.image_path);
      Object.assign(next, { image_path: null, image_source: null, image_status: 'none', image_prompt: null });
    }

    if (!next.image_path && settings.ai_enabled) {
      const result = await generateImage(next, settings.image_style);
      next.image_path = await store.uploadImage(next.id, result.blob);
      Object.assign(next, {
        image_source: 'ai', image_status: 'done', mood: result.mood, image_prompt: result.prompt,
      });
    }

    await store.saveEntry(next);

    if (entry) {
      location.hash = '#/write';
      return;
    }
    form.title.value = '';
    form.content.value = '';
    if (state.newImageUrl) URL.revokeObjectURL(state.newImageUrl);
    Object.assign(state, { newImage: null, newImageUrl: null, removed: false });
    say('已儲存。');
    updatePreview();
    refreshList();
  }

  updatePreview();
  refreshList();
}
