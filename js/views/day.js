import * as store from '../store.js';

// 某一天的日記列表。路由 #/day/YYYY-MM-DD
export async function render(el, params = []) {
  const date = params[0] ?? '';
  const month = date.slice(0, 7);
  const list = await store.getEntriesByDate(date);

  el.innerHTML = `
    <p><a href="#/calendar/${month}">‹ 回到日曆</a></p>
    <h1>${date}</h1>
    <div id="list"></div>
    <p><a class="btn" href="#/write/${date}">在這天寫一篇</a></p>
  `;

  const box = el.querySelector('#list');
  if (!list.length) {
    box.innerHTML = '<p class="muted">這天還沒有日記。</p>';
    return;
  }

  for (const item of list) {
    const a = document.createElement('a');
    a.className = 'entry-card';
    a.href = `#/entry/${item.id}`;

    const url = await store.getImageUrl(item.image_path);
    if (url) {
      const img = new Image();
      img.src = url;
      img.alt = '';
      a.append(img);
    }
    if (item.title) {
      const t = document.createElement('div');
      t.className = 'title';
      t.textContent = item.title;
      a.append(t);
    }
    const body = document.createElement('div');
    body.className = 'body';
    body.textContent = item.content;
    a.append(body);
    box.append(a);
  }
}
