# 圖文日記 PWA

手機優先的圖文日記。完整規格請見 [PLAN.md](PLAN.md)。

## 目前進度

- [x] 階段 0：專案骨架（hash 路由、manifest、service worker、無印風變數、圖示佔位）
- [ ] 階段 1：寫日記（本機）
- [ ] 階段 2：日曆瀏覽
- [ ] 階段 3：登入與雲端
- [ ] 階段 4：AI 生圖

## 本機預覽

1. 用 VS Code 安裝 **Live Server** 擴充功能
2. 對 `index.html` 按右鍵 →「Open with Live Server」
3. 瀏覽器開啟 `http://127.0.0.1:5500`

> Service worker 會快取檔案。修改靜態檔案後，請把 [sw.js](sw.js) 的 `VERSION` 加 1，
> 並在瀏覽器 DevTools → Application → Service Workers 勾選「Update on reload」。

## 部署到 GitHub Pages

1. 在 GitHub 建立新的 repository，把這個資料夾的內容推上去（根目錄就是 `index.html`）
2. Repository → **Settings** → **Pages**
3. **Source** 選 `Deploy from a branch`，Branch 選 `main`、資料夾選 `/ (root)`，按 Save
4. 約 1 分鐘後，網址會是 `https://<帳號>.github.io/<repo 名稱>/`

## 在 iPhone 安裝

1. 用 **Safari** 開啟上面的網址（必須是 Safari，其他瀏覽器無法加入主畫面）
2. 點下方的分享按鈕 →「加入主畫面」
3. 從主畫面圖示開啟，應該是全螢幕、沒有網址列
