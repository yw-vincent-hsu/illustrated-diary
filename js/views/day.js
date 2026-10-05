export function render(el, params = []) {
  const date = params[0] ?? '';
  el.innerHTML = `
    <h1>${date}</h1>
    <p class="muted">階段 2 會在這裡列出當天的日記。</p>
  `;
}
