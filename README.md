# Obsidian MCP Server (obsidian-mcp)

這是一個專為 Model Context Protocol (MCP) 設計的本地伺服器，旨在讓 AI 代理（如 Antigravity IDE、Claude Desktop 等）能夠直接讀寫您的 [Obsidian](https://obsidianmd.com/) Vault。

---

## 📖 什麼是 MCP (Model Context Protocol)?

**MCP** 的全名是 **Model Context Protocol**（模型上下文協定）。

它是由 Anthropic（Claude 模型的開發商）所推動的一項開源標準協定。您可以把它想像成是「**AI 界的 USB Type-C 介面**」。

### 解決了什麼問題？
在過去，如果想讓 AI 幫您讀取本地檔案、查詢資料庫、或操作特定的應用程式，每個 AI 工具（如 ChatGPT, Claude, GitHub Copilot）都需要開發專屬的外掛（Plugins）。這導致生態系非常破碎。

MCP 提出了一個標準化的雙向溝通協定。只要開發**一次** MCP Server（例如我們現在做的 `obsidian-mcp`），任何支援 MCP 標準的 AI 客戶端（Host）都能夠直接連上它，並取得它的能力。

### MCP 的三大核心功能：
1. **Resources (資源)**：讓 AI 可以讀取您的資料（例如：讀取特定檔案內容、API 回傳的資料）。
2. **Tools (工具)**：讓 AI 可以代替您執行動作（例如：新增筆記、發送 API 請求、控制智慧家電）。這也是我們本專案主要使用的功能。
3. **Prompts (提示詞)**：提供標準化的對話範本給 AI 使用。

**簡而言之：MCP 讓 AI 能夠以安全、標準化的方式，打破沙盒限制，安全地「看見」並「操作」您的本地電腦資源。**

---

## 🏗️ 系統架構圖

### 1. 部署與通訊架構

```mermaid
graph TB
    subgraph MACHINE["🖥️ 本機環境"]
        direction TB

        subgraph AI["AI 層 (MCP Host)"]
            IDE["🤖 Antigravity IDE (或 Claude Desktop)"]
        end

        subgraph MCP["MCP 層 (MCP Server)"]
            CFG["⚙️ mcp_config.json"]
            SRV["📦 obsidian-mcp\n(Node.js 子行程)"]
        end

        subgraph DATA["資料層（Obsidian Vault）"]
            direction LR
            INBOX["📁 inbox/\n📄 *.md"]
            DAILY["📁 daily/\n📄 YYYY-MM-DD.md"]
            OBS["🟣 Obsidian App"]
        end
    end

    IDE -- "1. 啟動並透過 stdio (標準輸入輸出) 溝通" --> SRV
    SRV -- "2. JSON-RPC 呼叫 Tools" --> SRV
    SRV -- "3. 直接讀寫 .md 檔案" --> INBOX
    SRV -- "3. 直接讀寫 .md 檔案" --> DAILY
    OBS -- "即時同步顯示" --> INBOX
    OBS -- "即時同步顯示" --> DAILY
```

### 2. Vault 資料結構與 Frontmatter

本專案的核心理念是**直接讀寫 Markdown 檔案，不依賴任何中間資料庫**。寫入的筆記會自動帶有以下格式的 Frontmatter Metadata，確保能與 Obsidian 原生的標籤及 Graph View 完美整合：

```markdown
---
title: 買牛奶
date: 2026-09-01
tags: [ai-note, inbox]
source: obsidian-mcp
---
```

---

## 🛠️ 提供的 10 大 MCP Tools (v2.1 架構)

本伺服器註冊了以下工具供 AI 使用，全數具備 `resolveSafePath` 邊界防穿透保護與 Token 預算防護：

| Tool 名稱 | 模式 | 說明 | 主要引數 |
|:---|:---:|:---|:---|
| `vault_overview` | 唯讀 | **全庫知識圖譜體檢**：出入度統計、導航孤島、知識沉澱、未建幽靈連結與核心樞紐 | `limit?` (預設 20), `folder?` |
| `add_note` | 寫入 | 新增筆記，支援任意子目錄與自動遞迴建檔 | `title`, `content`, `folder?`, `tags?` |
| `append_to_note` | 寫入 | 安全追加內容至文末，或精確插入指定章節標題下方 | `path`, `content`, `targetHeading?` |
| `update_frontmatter` | 寫入 | 原地增減標籤、更新狀態與自訂欄位，正文 100% 無損 | `path`, `addTags?`, `removeTags?`, `status?`, `customFields?` |
| `add_daily_log` | 寫入 | 追加內容至當日日誌頁，若不存在則自動初始化建立 | `content` |
| `get_note` | 唯讀 | 安全讀取指定筆記全文與 Frontmatter 元數據 | `path` |
| `list_notes` | 唯讀 | 列出筆記清單，支援目錄限定、標籤篩選與筆數上限 | `folder?`, `tag?`, `limit?` (預設 50) |
| `search_notes` | 唯讀 | 全文檢索筆記，具備標籤限定與長度受控摘要 | `query`, `tags?`, `folder?`, `limit?` (預設 10) |
| `get_backlinks` | 唯讀 | **雙向反向連結檢索**：查詢引用此筆記的所有來源與句子上下文 | `title` |
| `find_related_notes` | 唯讀 | **知識圖譜概念推薦**：基於共同標籤與雙鏈交集計算 Jaccard 相似度 | `path`, `limit?` (預設 5) |

---

## 🛡️ 安全防護架構 (Path Traversal & Security Guard)

伺服器全面內建 `resolveSafePath` 與 `safeDecodeURI` 物理邊界防禦機制：
- 內建**等冪收斂式 URL 解碼 (safeDecodeURI)**，徹底根絕 `%25252e` 多重編碼繞過漏洞，遇畸形編碼優雅安全降級。
- 內建 **Null Byte (`\0`) 注入攔截**，在邊界直接拋出 `SecurityViolationError`，防止底層檔案系統異常。
- 嚴格校驗所有傳入的相對路徑與資料夾名稱，防止任何以 `../` 跳脫 `VAULT_PATH` 的路徑穿透攻擊。
- 跨目錄同名檔案（如 `a/README.md` 與 `b/README.md`）以相對路徑為主鍵，保證實體檔案節點 100% 獨立不被覆蓋。
- 自動過濾 `.`、`..` 與非法字元，自動忽略 `.obsidian/`、`.git/` 與 `node_modules/` 等系統與隱藏目錄。
- 內建 `stripCodeBlocks` 語法屏蔽，程式碼區塊（` ``` `）內的語法示範絕不會被誤判為雙向連結。

---

## 🚀 安裝與執行

### 環境要求
- Node.js (v18 或以上)
- 您的本機需要有一個用來存放 Markdown 檔案的資料夾（如 Obsidian Vault 或本專案使用的 `docs/`）。

### 1. 編譯專案
```bash
npm install
npm run build
```

### 2. MCP 設定

在您的 AI 客戶端（如 Antigravity IDE）的 MCP 設定檔中，加入以下配置：

```json
{
  "mcpServers": {
    "obsidian-mcp": {
      "command": "node",
      "args": ["/絕對路徑/至/obsidian-mcp/dist/index.js"],
      "env": {
        "VAULT_PATH": "/絕對路徑/至/您的/Obsidian Vault"
      }
    }
  }
}
```

> **注意**：`VAULT_PATH` 是唯一需要您指定的環境變數，它指向您的筆記根目錄。

### 3. 重啟 AI 客戶端
設定完成後，重新載入您的 AI 客戶端 MCP 連線。接著，您就可以直接對 AI 說：「幫我記下...」或是「搜尋我 Vault 裡面關於...的筆記」了！
