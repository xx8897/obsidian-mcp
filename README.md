# Obsidian MCP Server (obsidian-mcp)

這是一個專為 Model Context Protocol (MCP) 設計的本地伺服器，旨在讓 AI 代理（如 Antigravity IDE、Claude Desktop 等）能夠直接讀寫您的 [Obsidian](https://obsidian.md/) Vault。

**核心理念**：直接以 Node.js 讀寫 Obsidian Vault 中的 `.md` 檔案，無任何中間資料庫或 JSON 緩存層，完美保留 Obsidian 檔案的純粹性，並且原生支援 Frontmatter 標籤。

---

## 🏗️ 系統架構圖

### 1. 部署與通訊架構

```mermaid
graph TB
    subgraph MACHINE["🖥️ 本機環境"]
        direction TB

        subgraph AI["AI 層"]
            IDE["🤖 Antigravity IDE (或任何 MCP Client)"]
        end

        subgraph MCP["MCP 層"]
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

    IDE -- "啟動並透過 stdio 溝通" --> SRV
    SRV -- "直接讀寫 .md 檔案" --> INBOX
    SRV -- "直接讀寫 .md 檔案" --> DAILY
    OBS -- "即時同步顯示" --> INBOX
    OBS -- "即時同步顯示" --> DAILY
```

### 2. Vault 資料結構與 Frontmatter

寫入的筆記會自動帶有以下格式的 Frontmatter Metadata，確保能與 Obsidian 原生的標籤及 Graph View 完美整合：

```markdown
---
title: 買牛奶
date: 2026-09-01
tags: [ai-note, inbox]
source: obsidian-mcp
---
```

---

## 🛠️ 提供的 MCP Tools

本伺服器註冊了以下工具供 AI 使用：

| Tool 名稱 | 說明 | 寫入/讀取目標 |
|:---|:---|:---|
| `add_note` | 新增一則筆記（可指定標題、內容、標籤） | `inbox/<title>.md` |
| `add_daily_log` | 追加內容至當天的日誌頁，若不存在則自動建立 | `daily/YYYY-MM-DD.md` |
| `get_note` | 讀取指定路徑的筆記全文 | 唯讀 |
| `list_notes` | 列出 Vault 內所有筆記與 metadata（支援資料夾過濾） | 唯讀 |
| `search_notes` | 跨檔案全文關鍵字搜尋 | 唯讀 |

---

## 🚀 安裝與執行

### 環境要求
- Node.js (v18 或以上)
- 您的本機需要有一個用來存放 Markdown 檔案的資料夾（如 Obsidian Vault）。

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
