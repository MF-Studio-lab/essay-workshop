# 作文工坊（Essay Workshop）

**簡潔的線上作文撰寫工具** — 免安裝、免登入，打開瀏覽器就能寫。

🔗 **線上使用：** [https://mf-studio-lab.github.io/essay-workshop](https://mf-studio-lab.github.io/essay-workshop)

---

## ✨ 功能特色

- **即時字數統計** — 支援中英混排、Unicode 字元正確計數
- **400 字門檻提示** — 未達 400 字時顯示尚缺字數，可先儲存為草稿
- **自動儲存** — 輸入停止 1.5 秒後自動儲存，不怕遺失內容
- **多篇管理** — 作文列表以卡片呈現，點擊即可繼續編輯
- **匯出檔案** — 一鍵匯出 TXT 純文字 或 MD Markdown 格式，方便備份
- **AI 潤稿** — 整合 Pollinations.ai 免費模型（無需 API Key），5 種模式：提升流暢度、擴寫細節、轉正式語氣、作文潤飾、作文補完
- **快速鍵** — `Ctrl+S` / `Cmd+S` 手動儲存
- **純前端 SPA** — 使用 `localStorage` 儲存，零後端依賴
- **RWD 響應式** — 手機、平板、桌面皆可使用

---

## 🚀 使用方式

### GitHub Pages（推薦）
直接開啟 👉 [https://mf-studio-lab.github.io/essay-workshop](https://mf-studio-lab.github.io/essay-workshop)

### 本機執行
```bash
git clone https://github.com/MF-Studio-lab/essay-workshop.git
cd essay-workshop
# 用任意靜態伺服器開啟，例如：
python3 -m http.server 8080
# 然後瀏覽器打開 http://localhost:8080
```

---

## 🤖 AI 潤稿說明

使用 **Pollinations.ai** 免費 API，無需註冊、無需 API Key，打開即用。

展開編輯器下方「✨ AI 潤稿」面板，選擇潤稿模式後點擊「開始潤稿」即可。

支援五種潤稿模式：
- **提升流暢度** — 使文章通順、生動自然，忠於原文
- **擴寫細節** — 補充更多細節與描寫
- **轉正式語氣** — 轉換為書面正式語氣
- **作文潤飾** — 嚴格忠於原文，只修正文法/用詞/標點，適度補充景物心理描寫
- **作文補完** — 將未完成文章合理補足後續，形成有開頭/經過/轉折/結尾的完整作文

---

## 📁 專案結構

```
essay-workshop/
├── index.html      ← SPA 入口，切換「我的作文」/「撰寫新篇」
├── css/
│   └── style.css   ← 完整樣式（導覽列、卡片列表、編輯器、匯出選單、潤稿面板、RWD）
├── js/
│   └── app.js      ← IIFE 封裝的應用邏輯（CRUD、字數、自動儲存、匯出、AI 潤稿）
└── README.md
```

---

## 🛠 技術棧

| 層 | 技術 |
|---|------|
| 結構 | HTML5 |
| 樣式 | CSS3（CSS Variables、Flexbox、RWD） |
| 邏輯 | Vanilla JavaScript ES6+（IIFE 模組化） |
| 儲存 | `localStorage` |
| AI API | Pollinations.ai（免費，無需 Key） |
| 部署 | GitHub Pages |

---

## 📝 資料結構

每篇作文以 JSON 物件儲存於瀏覽器 `localStorage`（key: `essay-workshop-data`）：

```json
{
  "id": 1,
  "title": "作文標題",
  "content": "作文全文...",
  "wordCount": 450,
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000
}
```

⚠️ **注意：** `localStorage` 為瀏覽器本機儲存。可透過「匯出檔案」按鈕將作文存為 TXT / MD 作為備份。

---

## 📄 授權

MIT License — 詳見 [LICENSE](LICENSE)