# EGM Goldfish 綜合架構審查報告 (Consolidated Review Report)

**審查標的**：`d:\codespace\projects\obsidian-mcp\README.md` (v2.1.0 架構說明書，共 140 行)  
**執行模式**：Preset 1 (Consolidated Report with All Review Rubrics)  
**審查週期**：Stage 5 (Zoom Out) $\rightarrow$ Stage 6 (Comprehension) $\rightarrow$ Stage 7 (Critic) $\rightarrow$ Stage 8 (Intermediate Zoom Out) $\rightarrow$ Stage 9 (Readiness)  
**完成時間**：2026-11-18 14:59:00 +08:00  

---

## Executive Summary (執行摘要)

本報告由 **Elephant-Goldfish 蜂群審查矩陣**（涵蓋 Skeptical Architect、Inventive Catalyst、Comprehension Reader、Hostile Design Critic、Structural Validator 與 Technical Copy Editor）對 `obsidian-mcp/README.md` 進行五階段全自動跨視角審查與合成。

### 核心結論：
1. **極簡無狀態定位獲得高度肯定**：Skeptical Architect 確立專案的核心價值在於「零中間資料庫、直接操作本地 Markdown、輕量無狀態」。
2. **否決過度工程提案**：堅決否決了引入常駐記憶體圖譜索引（In-memory Graph Index）與跨平台 `fs.watch` 檔案監聽器的提案，避免將單純的 MCP CLI 工具膨脹為脆弱的記憶體資料庫。
3. **確立三大防禦性護城河**：
   - 補齊「目標與非目標 (Goals & Non-Goals)」與「替代方案評估 (Alternatives Considered)」；
   - 修正 Mermaid 架構圖中伺服器自我迴圈呼叫之資料流謬誤；
   - 頂層文檔自底層函式命名（Altitude Drops）拉升至高層級「威脅模型（Threat Model）」。

---

## 彙整行動項目清單 (Consolidated Action Items by Priority)

### 🔴 阻斷級問題 (Blockers)

#### [BLK-01] 補齊「目標與非目標 (Goals & Non-Goals)」章節
- **問題描述**：文檔僅列出提供的 10 大工具，未明確定義系統界限。缺乏 Non-Goals 容易誘發審查者與使用者過度期待高併發、雲端同步等複雜需求。
- **行動方案**：於架構圖之前新增 `## 🎯 目標與非目標 (Goals & Non-Goals)`：
  - **Goals**：提供跨平台、零依賴、無資料庫的本機標準 MCP Server，支援 Markdown 檔案讀寫與輕量雙鏈關聯探索。
  - **Non-Goals**：
    1. 不取代 Obsidian 核心功能與複雜外掛（如 Dataview 查詢語法、Canvas 渲染）；
    2. 不支援超大企業庫（> 2,000 篇筆記）之即時圖譜運算；
    3. 不維護常駐快取層或中間嵌入資料庫（SQLite / Vector DB）；
    4. 不介入多設備雲端同步之衝突解決（由 Obsidian Sync 或 Git 自行處理）。

#### [BLK-02] 補齊「替代方案評估 (Alternatives Considered)」章節
- **問題描述**：違反 `feature-spec-standard.md` 之核心替代方案規則，未論證為何否決其他架構路徑。
- **行動方案**：新增 `## ⚖️ 替代方案評估 (Alternatives Considered)`，論證已否決之方案：
  1. **Obsidian Local REST API 外掛**：需維持 Obsidian 桌面應用程式常駐，具備外部外掛依賴與連接埠衝突風險。
  2. **本地 SQLite / Vector 嵌入快取層**：破壞純文字無狀態特性，帶來快取失效、冷啟動預熱延遲與狀態漂移負擔。
  3. **直接讀寫原始檔案系統（當前選型）**：最佳符合輕量、隨開即用與 100% 檔案相容性原則。

#### [BLK-03] 劃定圖譜運算適用規模，封死過度工程蔓延
- **問題描述**：全庫遍歷工具（`vault_overview`, `find_related_notes`）在超大庫存在 $O(N)$ 磁碟 I/O 開銷。先前建議引入常駐快取，但該解法會引入嚴重的維護代價。
- **行動方案**：維持「單趟隨選即時掃描 (On-demand parse)」架構，於 Non-Goals 明訂適用規模為個人筆記庫（< 2,000 篇），將超大規模分析導向 Obsidian 原生 Dataview。

---

### 🟡 重要級問題 (Majors)

#### [MAJ-01] 修復 Mermaid 架構圖箭頭錯誤（消除伺服器自環 Loopback）
- **問題描述**：第 54 行繪製為 `SRV -- "2. JSON-RPC 呼叫 Tools" --> SRV`，形成自我迴圈，悖離 MCP 協定由 Host 呼叫 Server 的規範。
- **行動方案**：更正為 `IDE -- "2. tools/call (JSON-RPC)" --> SRV`，清晰展現通訊主客體關係。

#### [MAJ-02] 掃除實作雜訊 (Anti-Weeds)，升級為威脅模型 (Threat Model)
- **問題描述**：第 95–104 行過度下墜至底層函式命名（如 `resolveSafePath`, `safeDecodeURI`, `stripCodeBlocks`, `SecurityViolationError`）。
- **行動方案**：拉升至宏觀架構高度，改寫為「系統安全邊界與威脅模型」：
  1. **沙盒根目錄綁定**：嚴格鎖定於 `VAULT_PATH`，透過實體路徑校驗防禦 Symlink 穿透；
  2. **路徑編碼安全**：防禦多重 URL 編碼與 Null Byte (`\0`) 注入；
  3. **敏感檔案隔離**：忽略隱藏目錄與非 Markdown 檔案；
  4. **語法屏蔽防護**：提取雙鏈時遮蔽程式碼區塊。

#### [MAJ-03] 寫入原子化防護（同目錄極簡置換）
- **問題描述**：Obsidian Auto-save 可能與 MCP 寫入指令並發衝突，導致文字覆蓋或檔案損毀。
- **行動方案**：宣告採用同目錄原子暫存替換策略（先寫入 `${target}.tmp.${Date.now()}` 再透過原子操作覆蓋原檔），杜絕寫入撕裂風險，並避免跨分區搬移錯誤。

#### [MAJ-04] 澄清關鍵概念與前置指引
- **問題描述**：未定義「Token 預算防護」、未說明跨目錄同名筆記時 `get_backlinks(title)` 的解析優先序、未說明 `mcp_config.json` 的設定檔路徑。
- **行動方案**：
  1. 明確說明「查詢類工具支援筆數上限（`limit`）以控管 Token 消耗」；
  2. 說明 `get_backlinks` 之 `title` 匹配規則；
  3. 補充客戶端 MCP 設定檔之常見路徑或指引。

#### [MAJ-05] 去行銷化與語氣校準 (De-fluffing & Calibration)
- **問題描述**：包含「AI 界的 USB Type-C」、「打破沙盒限制」、「物理邊界防禦」、「徹底根絕漏洞」、「100% 獨立」等行銷隱喻與未校準之絕對化宣稱。
- **行動方案**：依據 Style Goldfish 報告全數執行 `DROP`（精簡通用科普）與 `CALIBRATE`（改為乾爽、客觀的工程描述）。

---

### 🟢 輕微級問題 (Nits)

#### [NIT-01] 明訂 Stdio 協定衛生法則
- **行動方案**：文檔載明架構規範：`stdout` 嚴格保留給 JSON-RPC 通訊，所有除錯與警告日誌 100% 導向 `stderr`。

#### [NIT-02] 宣布 Tool 數量凍結原則
- **行動方案**：現行 10 大工具維持現狀，後續擴充優先採用通用引數，禁止任意新增特化 Tool。

#### [NIT-03] 標題對稱性與格式微調
- **行動方案**：移除標題結尾之問號與冒號，統一章節命名風格（如「支援之 MCP Tools」替代「提供的 10 大 MCP Tools」）。

---

## 溯源矩陣 (Traceability Matrix)

| 原始審查發現 ID | 提報特工角色 | 審查階段 | 嚴重度 | 對應之彙整行動項目 |
|:---|:---|:---:|:---:|:---|
| `ZO-1.1` | Skeptical Architect | Stage 5 | Major | **[BLK-03]** 劃定圖譜運算適用規模，封死過度工程蔓延 |
| `ZO-1.2` | Skeptical Architect | Stage 5 | Major | **[MAJ-02]** 掃除實作雜訊，升級為威脅模型 |
| `ZO-1.3` | Skeptical Architect | Stage 5 | Major | **[MAJ-01]** 修復 Mermaid 架構圖箭頭錯誤 |
| `ZO-1.4` | Skeptical Architect | Stage 5 | Nit | **[NIT-02]** 宣布 Tool 數量凍結原則 |
| `ZO-1.5` | Skeptical Architect | Stage 5 | Nit | **[MAJ-05]** 去行銷化與語氣校準 |
| `IC-2.1` | Inventive Catalyst | Stage 5 | Major | **[BLK-03]** 審視快取提議並依 Stage 8 裁定收斂為邊界規範 |
| `IC-2.2` | Inventive Catalyst | Stage 5 | Nit | **[MAJ-03]** 寫入原子化防護（同目錄極簡置換） |
| `COMP-1` | Comprehension Goldfish | Stage 6 | Major | **[MAJ-01]** 修復 Mermaid 架構圖箭頭錯誤 |
| `COMP-2` | Comprehension Goldfish | Stage 6 | Major | **[MAJ-04]** 澄清關鍵概念（Token 預算防護） |
| `COMP-3` | Comprehension Goldfish | Stage 6 | Major | **[MAJ-04]** 澄清跨目錄同名筆記匹配規則 |
| `COMP-4` | Comprehension Goldfish | Stage 6 | Major | **[MAJ-04]** 補充 MCP 設定檔路徑指引 |
| `COMP-5..7` | Comprehension Goldfish | Stage 6 | Nit | **[NIT-03]** 補充術語說明與移除突兀 docs/ 路徑 |
| `CRIT-1.1` | Hostile Design Critic | Stage 7 | Blocker | **[BLK-02]** 補齊「替代方案評估」章節 |
| `CRIT-1.2` | Hostile Design Critic | Stage 7 | Blocker | **[BLK-01]** 補齊「目標與非目標」章節 |
| `CRIT-1.3` | Hostile Design Critic | Stage 7 | Major | **[BLK-03]** 評估大規模 I/O 瓶頸並劃定 Non-Goal |
| `CRIT-1.4` | Hostile Design Critic | Stage 7 | Major | **[MAJ-03]** 寫入原子化防護（同目錄極簡置換） |
| `CRIT-1.5` | Hostile Design Critic | Stage 7 | Major | **[MAJ-02]** 威脅模型補強 Symlink 穿透防護說明 |
| `CRIT-1.6` | Hostile Design Critic | Stage 7 | Nit | **[NIT-01]** 明訂 Stdio 協定衛生法則 |
| `STRUC-1` | Structural Validator | Stage 7 | Blocker | **[BLK-02]** 補齊「替代方案評估」章節 |
| `STRUC-2` | Structural Validator | Stage 7 | Blocker | **[BLK-01]** 補齊「目標與非目標」章節 |
| `STRUC-3..5` | Structural Validator | Stage 7 | Major/Nit| **[MAJ-02], [NIT-03]** 風險維度擴充與標題對稱性 |
| `STYLE-1..5` | Technical Copy Editor | Stage 7 | Major/Nit| **[MAJ-05], [NIT-03]** 行銷修飾詞清理、絕對化主張校準 |
| `IZO-1..6` | Intermediate Zoom Out | Stage 8 | Blocker/Major| **[BLK-01..03], [MAJ-01..03]** 最終架構裁定與邊界固化 |

---

## 階段報告存檔索引 (Artifact Index)

各階段完整獨立審查報告已全數產出並封存於專案審查目錄：
- Stage 5 宏觀審查報告：[zoom_out_report.md](file:///C:/Users/xx8897/.gemini/antigravity/brain/969550dc-d99b-4643-9b2f-eacffa956b8a/zoom_out_report.md)
- Stage 6 理解度審查報告：[comprehension_report.md](file:///C:/Users/xx8897/.gemini/antigravity/brain/969550dc-d99b-4643-9b2f-eacffa956b8a/comprehension_report.md)
- Stage 7 批判審查報告：[critic_report.md](file:///C:/Users/xx8897/.gemini/antigravity/brain/969550dc-d99b-4643-9b2f-eacffa956b8a/critic_report.md)
- Stage 8 中繼宏觀評決報告：[intermediate_zoom_out_report.md](file:///C:/Users/xx8897/.gemini/antigravity/brain/969550dc-d99b-4643-9b2f-eacffa956b8a/intermediate_zoom_out_report.md)
- Stage 9 實作就緒審查報告：[implementation_readiness_report.md](file:///C:/Users/xx8897/.gemini/antigravity/brain/969550dc-d99b-4643-9b2f-eacffa956b8a/implementation_readiness_report.md)
