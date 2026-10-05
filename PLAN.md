# 圖文日記 PWA — 開發計畫書

> 給 Claude Code 的說明：這份文件是本專案的唯一規格來源。請先完整閱讀，再從「階段 0」開始，**一次只做一個階段**，每個階段完成後停下來，讓使用者在 iPhone 上驗證，確認後才進入下一階段。

---

## 1. 專案概述

一個以手機為主的「圖文日記」PWA。使用者寫文字日記，每篇可以附一張圖片：手動上傳照片，或在未上傳時由 AI 依日記內容自動生成風格統一的配圖。可用日曆瀏覽過往日記。

### 使用者

- **主要使用者**：專案擁有者的伴侶，每天寫 1～2 篇
- **次要使用者**：專案擁有者本人，偶爾使用
- 兩人的日記**完全分開**，互相看不到
- 主要裝置：iPhone（以 Safari「加入主畫面」的 PWA 方式使用），也要能在 Android 與桌面瀏覽器正常運作

### 硬性限制

1. **整套完全免費**，不綁信用卡。用量假設：2 人 × 每天 1～2 篇
2. 前端不使用框架與建置工具：原生 HTML + CSS + JavaScript（ES Modules），可直接部署到 GitHub Pages
3. 所有 API 金鑰不可出現在前端或 Git 版本庫中（Supabase anon key 例外，它本來就設計為公開，安全性由 RLS 保障）

### 關於開發者

- 熟悉 PWA（manifest、service worker）、localStorage、GitHub Pages 部署、VS Code Live Server
- **沒有資料庫與雲端儲存的經驗**：涉及 Supabase、SQL、雲端後台設定時，請用白話解釋「這一步在做什麼、為什麼需要」，並給出逐步的點擊路徑
- 請用繁體中文溝通，文案遵循《中文文案排版指北》（中英文之間加空格、使用全形標點等）

---

## 2. 技術架構

| 用途 | 服務 | 免費額度 | 備註 |
|---|---|---|---|
| 網站託管 | GitHub Pages | 免費 | 純靜態檔案 |
| 登入 | Supabase Auth（Google OAuth） | 5 萬月活躍使用者 | 需在 Google Cloud 建立 OAuth 用戶端（免費） |
| 日記資料 | Supabase Postgres | 500 MB | 純文字，量很小 |
| 圖片 | Supabase Storage（私有 bucket） | 1 GB | 上傳前先在前端壓縮 |
| 伺服端邏輯 | Supabase Edge Functions | 每月 50 萬次呼叫 | 放 Cloudflare 金鑰的中繼站 |
| AI 文字分析 | Cloudflare Workers AI（文字模型） | 每天 1 萬 neurons（與生圖共用） | 從日記萃取場景與情緒 |
| AI 生圖 | Cloudflare Workers AI `@cf/black-forest-labs/flux-1-schnell` | 同上 | 一張 1024×1024 約 60 neurons |

前端透過 CDN 以 ES Module 載入 `@supabase/supabase-js`（例如 `https://esm.sh/@supabase/supabase-js@2`），不需要 npm 建置。

### 架構圖

```
iPhone 主畫面圖示
   ↓
PWA（GitHub Pages：HTML / CSS / JS）
   ├─ supabase-js → Supabase Auth（Google 登入）
   ├─ supabase-js → Postgres（entries、profiles，受 RLS 保護）
   ├─ supabase-js → Storage（私有 bucket，signed URL 讀圖）
   └─ 呼叫 Edge Function「generate-image」
            ↓（伺服端，持有 Cloudflare 金鑰）
        Cloudflare Workers AI
          ① 文字模型：日記 → 結構化場景 JSON
          ② FLUX.1 schnell：Prompt → 圖片
            ↓
        存入 Storage，更新 entries
```

### 資料層抽象（重要）

前端所有讀寫都透過單一模組 `js/store.js`，對外提供一致的介面，例如：

```js
listEntriesByMonth(year, month)
getEntriesByDate(date)
getEntry(id)
saveEntry(entry)        // 新增或更新
deleteEntry(id)
uploadImage(entryId, blob)
getImageUrl(path)
getSettings() / saveSettings(settings)
```

- 階段 1～2：實作為 **IndexedDB** 版本（`store-local.js`），因為 localStorage 約 5 MB 不夠放圖片
- 階段 3：新增 **Supabase** 版本（`store-supabase.js`），畫面程式碼不需修改
- 階段 3 提供「把本機日記搬到雲端」的一次性功能

---

## 3. 建議的檔案結構

```
/
├─ index.html
├─ manifest.webmanifest
├─ sw.js                     # service worker：快取 App 外殼，離線可開啟
├─ icons/                    # 192、512、apple-touch-icon（180）
├─ css/
│  ├─ tokens.css             # 主題變數（色彩、字體、間距）
│  └─ app.css
├─ js/
│  ├─ app.js                 # 路由與畫面切換
│  ├─ config.js              # Supabase URL 與 anon key（公開值）
│  ├─ store.js               # 資料層介面，依設定切換實作
│  ├─ store-local.js         # IndexedDB
│  ├─ store-supabase.js      # Supabase
│  ├─ image.js               # 壓縮、縮圖、HEIC 處理
│  ├─ ai.js                  # 呼叫 generate-image（階段 1～2 為模擬版）
│  └─ views/
│     ├─ editor.js           # 撰寫 / 編輯
│     ├─ calendar.js         # 月曆
│     ├─ day.js              # 某天的日記列表
│     └─ settings.js         # 設定
└─ supabase/
   ├─ migrations/            # SQL：資料表、RLS、Storage 規則
   └─ functions/
      └─ generate-image/
         └─ index.ts
```

路由使用 hash（`#/write`、`#/calendar`、`#/day/2026-10-05`、`#/entry/:id`、`#/settings`），避免 GitHub Pages 的 404 問題。開啟 App 預設進入「寫日記」頁。

---

## 4. 資料模型

### `profiles`（每位使用者一筆設定）

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | uuid PK | = `auth.users.id` |
| `display_name` | text | |
| `theme` | text | 預設 `muji` |
| `image_style` | text | AI 配圖風格，預設 `muji` |
| `ai_enabled` | boolean | 預設 `true` |
| `background_path` | text null | 自訂背景圖在 Storage 的路徑 |
| `created_at` | timestamptz | |

### `entries`（日記，**一天可以有多篇**）

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users.id`，預設 `auth.uid()` |
| `entry_date` | date | 日記所屬日期，以台灣時區（Asia/Taipei）計算 |
| `title` | text null | 選填 |
| `content` | text | |
| `mood` | text null | AI 萃取的情緒標籤 |
| `image_path` | text null | Storage 路徑 |
| `image_source` | text null | `upload` / `ai` |
| `image_status` | text | `none` / `pending` / `done` / `failed` |
| `image_prompt` | text null | 實際送出的生圖 Prompt（方便除錯） |
| `created_at` / `updated_at` | timestamptz | |

索引：`(user_id, entry_date)`。

### 安全規則（RLS）

- 三個表都啟用 RLS
- `profiles`：只能讀寫 `id = auth.uid()` 的那一筆
- `entries`：select / insert / update / delete 都限制 `user_id = auth.uid()`
- 新使用者註冊時以 trigger 自動建立 `profiles`

### Storage

- 一個**私有** bucket：`diary`
- 路徑規則：`{user_id}/entries/{entry_id}.jpg`、`{user_id}/background.jpg`
- Storage policy：只能存取第一層資料夾名稱等於自己 `auth.uid()` 的檔案
- 前端讀圖使用 signed URL（有效期 1 小時），並在記憶體中快取

所有 SQL 請寫成 `supabase/migrations/` 內的檔案，並附上「在 Supabase 後台 SQL Editor 貼上執行」的說明，讓開發者不必安裝 Supabase CLI。

---

## 5. 圖片處理

- 選圖使用 `<input type="file" accept="image/*">`
- iPhone 照片可能是 HEIC；iOS Safari 選取時通常會轉成 JPEG，但仍需偵測，無法解碼時給出友善提示
- 前端以 canvas 壓縮：長邊最大 1280 px、JPEG 品質約 0.8，目標約 150～250 KB
- 讀取 EXIF 方向，避免照片轉向
- 日曆縮圖直接使用同一張圖以 CSS 縮放即可（MVP 不另存縮圖）
- 容量估算：每年約 1,500 張 × 約 200 KB ≈ 300 MB，1 GB 約可用 3 年；設定頁顯示目前用量

---

## 6. AI 生圖設計

### 觸發時機

儲存日記時，若「沒有上傳照片」且 `ai_enabled = true`，將 `image_status` 設為 `pending` 並呼叫 Edge Function。畫面先顯示風格一致的佔位圖，完成後替換。使用者也可以手動按「重新生成」。

### Edge Function `generate-image`

1. 驗證呼叫者的 Supabase JWT，取得 `user_id`
2. 讀取該篇日記，確認屬於呼叫者
3. **每日上限**：每位使用者每天最多 10 張（含重新生成），保護共用的免費額度
4. 呼叫 Cloudflare 文字模型，要求輸出 JSON：
   ```json
   { "scene": "...", "mood": "...", "time_of_day": "...", "weather": "...", "objects": ["..."] }
   ```
   - 欄位以**英文**輸出（FLUX 對英文 Prompt 效果較好）
   - 指示模型：**不可包含人名、地名、地址、公司名等可識別資訊**，只描述抽象場景
   - 請選擇目前 Workers AI 目錄中、對繁體中文理解較好的文字模型（實作時查閱最新模型清單）
5. 套用固定的風格模板組成 Prompt（風格由程式控制，不交給模型自由發揮）
6. 呼叫 `@cf/black-forest-labs/flux-1-schnell`（steps 4，1024×1024 或 1024×768）
7. 將圖片存入 Storage，更新 `image_path`、`image_source = 'ai'`、`image_status = 'done'`、`mood`、`image_prompt`
8. 任一步失敗：`image_status = 'failed'`，回傳友善錯誤；Cloudflare 免費額度用完時，提示「今天的 AI 額度已用完，明天再試或手動上傳照片」

金鑰以 Supabase secrets 儲存：`CF_ACCOUNT_ID`、`CF_API_TOKEN`（Token 權限只開 Workers AI）。

### 風格模板（初版）

| 代號 | 名稱 | 模板方向 |
|---|---|---|
| `muji` | 無印風（預設） | minimalist, soft natural light, muted beige and off-white palette, lots of negative space, calm, simple composition |
| `watercolor` | 溫暖水彩 | warm watercolor illustration, soft edges, paper texture |
| `anime` | 手繪動畫風 | hand-painted anime background art, lush, nostalgic |
| `film` | 復古底片 | 35mm film photo, grain, faded colors |

所有模板都附加：`no text, no letters, no watermark, no close-up faces`。

---

## 7. 視覺設計：無印風

- 色彩（寫在 `css/tokens.css` 的 CSS 變數）：底色 `#F5F2EB`、卡片 `rgba(255,255,255,0.85)`、文字 `#3E3A36`、次要文字 `#8A857D`、線條 `#D9D4CA`、強調色 `#7F0019`
- 字體：系統無襯線字（`-apple-system, "PingFang TC", "Noto Sans TC", sans-serif`），字距略寬、行高 1.7
- 大量留白、細線分隔、直角或極小圓角、無陰影或極淡陰影
- **自訂背景**：設定頁上傳圖片作為全 App 背景，自動疊一層半透明底色遮罩確保文字可讀；可一鍵還原預設
- 主題全部走 CSS 變數，之後新增主題只需新增一組變數
- 行動優先：觸控目標至少 44 px、支援 iPhone 安全區域（`env(safe-area-inset-*)`）、輸入框字級至少 16 px（避免 iOS 自動放大）
- 支援系統深色模式為加分項，非 MVP 必要

---

## 8. 隱私與安全

- RLS + 私有 Storage + signed URL，兩位使用者資料完全隔離
- 送去 AI 的只有日記內容本身（在伺服端處理），生圖 Prompt 只含抽象場景描述
- 設定頁：
  - AI 生圖開關
  - **匯出全部資料**（JSON + 圖片打包成 zip，可使用 JSZip CDN）
  - **刪除我的所有資料**（日記、圖片、設定，二次確認）
  - 登出
- 專案擁有者技術上可從 Supabase 後台看到資料，這點已與伴侶說明；未來可評估端對端加密（非 MVP）
- 選配：App 開啟時的 4 位數 PIN 鎖（僅存在本機，屬於防偷看等級，非加密）——放在階段 5

---

## 9. 免費方案的風險與對策

| 風險 | 對策 |
|---|---|
| Supabase 免費專案閒置 7 天會暫停 | 每天使用不會觸發；若暫停，資料保留，後台可恢復。README 寫下恢復步驟 |
| Supabase 免費版無自動備份 | 提供匯出功能，建議每月匯出一次 |
| Cloudflare 每日額度用完 | 免費方案超額會直接失敗、不會扣款；前端顯示友善訊息 |
| 免費額度政策變動 | 生圖邏輯集中在 Edge Function，可替換供應商而不動前端 |
| Storage 1 GB 用滿 | 前端壓縮；設定頁顯示用量 |

---

## 10. 開發階段

每階段結束時：部署到 GitHub Pages → 開發者在 iPhone 驗證 → 確認後才繼續。

### 階段 0：專案骨架

- 建立檔案結構、`index.html`、`manifest.webmanifest`、`sw.js`、圖示佔位、`tokens.css`
- hash 路由與空白頁面切換
- 部署到 GitHub Pages
- ✅ **驗收**：iPhone Safari「加入主畫面」後，點圖示以全螢幕開啟，能切換各頁

### 階段 1：寫日記（本機）

- 撰寫頁：日期（預設今天，可改）、標題（選填）、內文、選擇 / 移除照片、儲存
- IndexedDB 版 `store-local.js`
- 圖片壓縮
- 模擬 AI：未選照片時，依關鍵字產生無印風色塊 SVG 佔位圖（`ai.js` 介面與正式版一致）
- 設定頁：更換 / 還原背景圖
- ✅ **驗收**：同一天寫兩篇、一篇有照片一篇沒有；關閉 App 再開，內容、圖片、背景都還在

### 階段 2：日曆瀏覽

- 月曆檢視：有日記的日子顯示縮圖或小圓點，可切換月份
- 點日期 → 當天日記列表 → 點進單篇
- 編輯與刪除
- ✅ **驗收**：能用月曆找到一週前寫的日記並修改、刪除

### 階段 3：登入與雲端

開發者需在後台操作的部分，請提供逐步說明：
1. 建立 Supabase 專案（區域選離台灣近的，例如 Tokyo 或 Singapore）
2. 在 Google Cloud Console 建立 OAuth 用戶端，填入 Supabase 的 callback URL
3. 在 Supabase 啟用 Google 登入、設定 Site URL 與 Redirect URLs（GitHub Pages 網址）
4. 在 SQL Editor 執行 migrations

程式部分：
- 登入頁（Google 登入）、登出
- `store-supabase.js`、RLS、Storage policy
- 本機日記一鍵搬到雲端
- 匯出、刪除所有資料
- ⚠️ **優先驗證的風險**：iPhone 主畫面 PWA（standalone 模式）中的 Google OAuth 重新導向，可能無法回到 PWA 內或遺失 session。**本階段一開始就先在實機測試**。若不穩定，備案為 Supabase **Email OTP（6 位數驗證碼）**登入，全程不離開 PWA
- ✅ **驗收**：伴侶與開發者各自登入，看不到對方的日記；手機寫的日記在電腦上登入也看得到

### 階段 4：AI 生圖

開發者需操作：
1. 註冊 Cloudflare 免費帳號，建立只含 Workers AI 權限的 API Token
2. 在 Supabase 設定 secrets 並部署 Edge Function（提供不需安裝 CLI 的後台部署方式，或最簡單的 CLI 步驟）

程式部分：
- Edge Function `generate-image`（第 6 節）
- 前端：pending 佔位、完成後替換、失敗重試、重新生成
- 設定頁：風格切換、AI 開關
- ✅ **驗收**：寫一篇不附照片的日記，數十秒內出現無印風配圖；換成水彩風後重新生成，風格明顯改變

### 階段 5：打磨（選做）

- PIN 鎖
- 深色模式
- 全文搜尋
- 時間軸檢視
- 寫作提醒

---

## 11. 不在 MVP 範圍內

- 兩人共享或互看日記
- 一篇多張圖
- 端對端加密
- 原生 App 上架
- 推播通知

---

## 12. 給 Claude Code 的工作守則

1. 一次只做一個階段，完成後列出「使用者需要做的事」與「驗收步驟」，然後停下
2. 先寫最少可運作的版本，避免過度抽象
3. 不要把任何 secret 寫進程式或 commit；提供 `.gitignore`
4. 每次需要開發者到後台操作時，給出完整、可照做的步驟，並解釋目的
5. 外部服務的模型名稱、額度、介面若可能已變動，實作前先查閱官方文件確認
6. 介面文字使用繁體中文，遵循《中文文案排版指北》
7. 每個階段結束更新 `README.md`：如何本機預覽、如何部署、目前完成的功能
