import { render as renderEditor } from './views/editor.js';
import { render as renderCalendar } from './views/calendar.js';
import { render as renderDay } from './views/day.js';
import { render as renderSettings } from './views/settings.js';
import { applyBackground } from './background.js';
import { requestPersistence } from './store.js';

const viewEl = document.getElementById('view');
const tabs = document.querySelectorAll('#tabbar a');

// 路由表：hash 的第一段 → 畫面
const routes = {
  write: renderEditor,
  calendar: renderCalendar,
  day: renderDay,
  entry: renderEditor,
  settings: renderSettings,
};

// 哪個路由要讓哪個分頁亮起
const tabOf = { write: 'write', entry: 'write', calendar: 'calendar', day: 'calendar', settings: 'settings' };

function parseHash() {
  const [name = '', ...params] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: routes[name] ? name : 'write', params };
}

function navigate() {
  const { name, params } = parseHash();
  tabs.forEach((a) => a.classList.toggle('active', a.dataset.route === tabOf[name]));
  // 每次切換都用新的容器；畫面若是非同步載入、來不及完成，只會寫進已被丟棄的舊容器
  const section = document.createElement('div');
  viewEl.replaceChildren(section);
  routes[name](section, params);
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', navigate);
if (!location.hash) location.replace('#/write');
navigate();
applyBackground();
requestPersistence();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW 註冊失敗', err));
}
