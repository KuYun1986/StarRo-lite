# ⚾ 繁星仙境｜7 天 Discord 全壘打挑戰賽

一個可直接部署 GitHub Pages 的繁體中文棒球打擊小遊戲。

## 功能

- 投手投球、移動棒球、揮棒動畫、時間判定。
- 空白鍵 / 手機觸控揮棒。
- 每日 10 次、7 個台灣日期制的活動期程。
- 全壘打 100 分／三壘安打 60 分／二壘安打 40 分／一壘安打 20 分。
- 本機試玩：不需設定，開網頁即可玩，戰績在 localStorage。
- 線上多人：Firebase Anonymous Authentication + Realtime Database，儲存每個玩家戰績，排行榜自動更新。
- 複製 Discord 戰績。

## 1. 本機試玩

直接將 `index.html`、`style.css`、`app.js`、`firebase-config.js` 放入同一資料夾。用本機 HTTP 伺服器啟動，或部署到 GitHub Pages：

```bash
python -m http.server 8000
```

用瀏覽器開啟 `http://localhost:8000`。尚未設定 Firebase 會自動以本機模式開啟。

## 2. 部署到 GitHub Pages

1. 到 GitHub 建立新 repository，例如 `starro-baseball`。
2. 把資料夾內四個網頁檔案上傳到 repository **根目錄**：`index.html`、`style.css`、`app.js`、`firebase-config.js`。
3. 打開 GitHub repository → Settings → Pages → Build and deployment，選 **Deploy from a branch**、`main`、`/(root)`、Save。
4. 網址會類似 `https://你的帳號.github.io/starro-baseball/`。
5. 可把連結貼到 Discord 群組內。**只有 GitHub Pages 不會共享排行榜**，還需要第 3 步的 Firebase。

## 3. 開啟多人排行榜（必要）

1. 到 https://console.firebase.google.com/ 建立 Firebase 專案。
2. Project settings → Your apps → 建立 **Web app**，取得 `firebaseConfig` 的 `apiKey`、`authDomain`、`projectId`、`appId` 等欄位。
3. Build → Authentication → Sign-in method → 啟用 **Anonymous**（匿名登入）。
4. Build → Realtime Database → 建立資料庫。注意是 **Realtime Database**，不是 Cloud Firestore；複製完整資料庫 URL，例如 `https://你的專案-default-rtdb.asia-southeast1.firebasedatabase.app`。
5. Realtime Database → Rules，貼上 `database.rules.json` 內容，按 Publish。**不要使用公開所有人寫入的測試規則。**
6. 在 `firebase-config.js` 中，填上 Firebase 網頁設定值，包括 `databaseURL`。把更新後的檔案上傳 GitHub。
7. 開啟網址，右上角應顯示「🟢 多人連線」。以不同瀏覽器或裝置測試能否看見對方成績。

**重要公平性提醒**：這是純前端休閒賽，Firebase 規則限制玩家只能修改自己帳號，但**無法證明玩家真的完成每次打擊，也無法阻止修改前端程式送假分數或清除匿名登入資料重新取得身分**。正式有價獎品比賽，應將判定、計次、結算移到可信任的後端（例如 Cloud Functions）並另設 Discord OAuth 綁定、驗證及防作弊；目前版本適合無獎金／友善社群活動。Firebase 也可能依用量收費，請設定預算警示。

## 4. 活動日期、每人次數

編輯 `firebase-config.js`：

```js
eventStart: '2026-10-09', // 台灣時間 00:00 開始
eventDays: 7, // 活動天數
eventId: 'starro-derby-2026-10', // 更換 ID 可開新賽季
dailyAttempts: 10
```

**請在活動前固定好設定**。如在比賽中途修改 `eventStart` 或 `dailyAttempts`，舊成績不會自動重算。

## 5. 運作細節

- 挑戰次數在**揮棒或球飛過未揮**時扣 1；投球開始但尚未判定不扣次數。
- 打擊結果有機率成分，抓準時間可提升全壘打機率，非百分百必中。
- 同分按全壘打總數，再按安打總數排名。
- Firebase 匿名帳號會儲存在瀏覽器。不同瀏覽器是不同帳號；請勿把暱稱當成安全身分證明。
- 資料庫內的路徑是 `events/{eventId}/players/{uid}`。
- 顯示前 30 名，排行榜所有玩家資料會下載至前端；如果未來人數極大，建議改後端分頁查詢。

## 檔案清單

- `index.html`：畫面結構
- `style.css`：響應式球場與介面
- `app.js`：遊戲判定、積分、Firebase 同步
- `firebase-config.js`：活動資訊及 Firebase 設定
- `database.rules.json`：Firebase Realtime Database 安全規則
