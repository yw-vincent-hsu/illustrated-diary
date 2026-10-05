import * as store from '../store.js';
import { todayTW } from '../util.js';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

// 月曆。路由 #/calendar 或 #/calendar/YYYY-MM
export async function render(el, params = []) {
  const today = todayTW();
  const ym = /^\d{4}-\d{2}$/.test(params[0] ?? '') ? params[0] : today.slice(0, 7);
  const year = Number(ym.slice(0, 4));
  const month = Number(ym.slice(5, 7));

  const shift = (delta) => {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };

  const entries = await store.listEntriesByMonth(year, month);
  const byDate = new Map();
  for (const e of entries) {
    if (!byDate.has(e.entry_date)) byDate.set(e.entry_date, []);
    byDate.get(e.entry_date).push(e);
  }

  el.innerHTML = `
    <div class="cal-head">
      <a class="btn" href="#/calendar/${shift(-1)}" aria-label="上個月">‹</a>
      <h1>${year} 年 ${month} 月</h1>
      <a class="btn" href="#/calendar/${shift(1)}" aria-label="下個月">›</a>
    </div>
    <div class="cal-grid" id="grid"></div>
    ${entries.length ? '' : '<p class="muted">這個月還沒有日記。</p>'}
  `;

  const grid = el.querySelector('#grid');
  for (const w of WEEKDAYS) {
    const h = document.createElement('div');
    h.className = 'cal-week';
    h.textContent = w;
    grid.append(h);
  }

  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let i = 0; i < firstWeekday; i++) grid.append(document.createElement('div'));

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${ym}-${String(day).padStart(2, '0')}`;
    const list = byDate.get(date);
    const cell = document.createElement('a');
    cell.className = 'cal-day';
    cell.href = `#/day/${date}`;
    if (date === today) cell.classList.add('today');

    const num = document.createElement('span');
    num.textContent = day;
    cell.append(num);

    if (list) {
      const withImage = list.find((e) => e.image_path);
      const url = withImage && (await store.getImageUrl(withImage.image_path));
      if (url) {
        cell.classList.add('has-image');
        cell.style.backgroundImage = `url("${url}")`;
      } else {
        const dot = document.createElement('i');
        dot.className = 'dot';
        cell.append(dot);
      }
      if (list.length > 1) {
        const n = document.createElement('b');
        n.textContent = list.length;
        cell.append(n);
      }
    }
    grid.append(cell);
  }
}
