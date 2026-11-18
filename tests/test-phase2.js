/**
 * Copyright 2026 xx8897 and contributors
 * Phase 2 核心讀取與知識圖譜工具驗收測試 (TDD Red-Green Verification)
 */

import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempVaultDir = path.join(__dirname, "temp-vault-phase2");

// 設定測試環境變數
process.env.VAULT_PATH = tempVaultDir;

// 清理與初始化測試 Vault
if (fs.existsSync(tempVaultDir)) {
  fs.rmSync(tempVaultDir, { recursive: true, force: true });
}
fs.mkdirSync(tempVaultDir, { recursive: true });

// 建立階層測試檔案結構
// 1. note-a: 標籤 [architecture, mcp]，提及 [[note-b]] 與 [[note-c|別名C]]
// 2. note-b: 標籤 [architecture, cdp]
// 3. note-c: 標籤 [database]
// 4. sub/note-d: 標籤 [mcp]，提及 [[note-b]]

fs.mkdirSync(path.join(tempVaultDir, "projects"), { recursive: true });

fs.writeFileSync(
  path.join(tempVaultDir, "projects", "note-a.md"),
  `---
title: Note A
date: 2026-11-18
tags:
  - architecture
  - mcp
source: obsidian-mcp
---

這是 Note A 核心系統。
此處引用了 [[note-b]] 服務進行連線。
同時也參考了 [[note-c|別名C]] 的資料定義。
`,
  "utf-8"
);

fs.writeFileSync(
  path.join(tempVaultDir, "projects", "note-b.md"),
  `---
title: Note B
date: 2026-11-18
tags:
  - architecture
  - cdp
source: obsidian-mcp
---

這是 Note B 核心服務。
負責處理底層串流。
`,
  "utf-8"
);

fs.writeFileSync(
  path.join(tempVaultDir, "projects", "note-c.md"),
  `---
title: Note C
date: 2026-11-18
tags:
  - database
source: obsidian-mcp
---

這是 Note C 資料庫設定。
`,
  "utf-8"
);

fs.mkdirSync(path.join(tempVaultDir, "inbox"), { recursive: true });
fs.writeFileSync(
  path.join(tempVaultDir, "inbox", "note-d.md"),
  `---
title: Note D
date: 2026-11-18
tags:
  - mcp
source: obsidian-mcp
---

這是 Note D 靈感速記。
另外呼叫 [[note-b]] 進行同步。
`,
  "utf-8"
);

console.log("🧪 開始執行 Phase 2 讀取與圖譜功能單元測試...");

async function runTests() {
  const { listNotes } = await import("../dist/tools/list-notes.js");
  const { getNote } = await import("../dist/tools/get-note.js");
  const { searchNotes } = await import("../dist/tools/search-notes.js");
  const { getBacklinks } = await import("../dist/tools/get-backlinks.js");
  const { findRelatedNotes } = await import("../dist/tools/find-related.js");

  // 測試 1：list_notes 支援 folder 與 tag 過濾及 limit
  console.log("\n▶️ 測試 1: list_notes 依 folder 與 tag 篩選");
  const listRes1 = await listNotes({ folder: "projects", tag: "architecture" });
  assert.ok(listRes1.includes("Note A"), "應包含 Note A");
  assert.ok(listRes1.includes("Note B"), "應包含 Note B");
  assert.strictEqual(listRes1.includes("Note C"), false, "Note C 標籤不符應被排除");
  assert.strictEqual(listRes1.includes("Note D"), false, "Note D 在 inbox 不符目錄應被排除");
  console.log("  ✅ 測試 1 通過：folder 與 tag 過濾運作正確");

  // 測試 2：get_note 安全讀取與防穿透
  console.log("\n▶️ 測試 2: get_note 安全讀取與阻斷逃逸");
  const noteContent = await getNote({ path: "projects/note-a.md" });
  assert.ok(noteContent.includes("Note A"), "標題應存在");
  assert.ok(noteContent.includes("這是 Note A 核心系統。"), "正文應存在");

  let caughtEscape = false;
  try {
    await getNote({ path: "../../etc/passwd" });
  } catch (err) {
    caughtEscape = true;
  }
  assert.strictEqual(caughtEscape, true, "惡意路徑應被安全守衛阻斷");
  console.log("  ✅ 測試 2 通過：正文解析與防穿透防禦正確");

  // 測試 3：search_notes 預算受控檢索與 tag 篩選
  console.log("\n▶️ 測試 3: search_notes 全文檢索與標籤限定");
  const searchRes = await searchNotes({ query: "核心服務", tags: ["architecture"] });
  assert.ok(searchRes.includes("Note B"), "應檢索到包含核心服務且具備 architecture 標籤的 Note B");
  assert.strictEqual(searchRes.includes("Note C"), false, "無關檔案不應出現");
  console.log("  ✅ 測試 3 通過：關鍵字匹配與標籤限定正確");

  // 測試 4：get_backlinks 反向連結解析
  console.log("\n▶️ 測試 4: get_backlinks 反向連結搜尋 (目標: 'note-b')");
  const backlinksRes = await getBacklinks({ title: "note-b" });
  assert.ok(backlinksRes.includes("Note A") || backlinksRes.includes("note-a.md"), "Note A 應作為反向連結來源");
  assert.ok(backlinksRes.includes("Note D") || backlinksRes.includes("note-d.md"), "Note D 應作為反向連結來源");
  assert.strictEqual(backlinksRes.includes("Note C"), false, "Note C 未引用 note-b 不應列入");
  console.log("  ✅ 測試 4 通過：雙向反向連結與摘要抓取正確");

  // 測試 5：find_related_notes Jaccard 概念推薦
  console.log("\n▶️ 測試 5: find_related_notes 關聯筆記推薦 (目標: 'projects/note-a.md')");
  const relatedRes = await findRelatedNotes({ path: "projects/note-a.md", limit: 3 });
  assert.ok(relatedRes.includes("Note B") || relatedRes.includes("note-b.md"), "Note B 與 Note A 有共同標籤與雙鏈，應優先被推薦");
  console.log("  ✅ 測試 5 通過：Jaccard 關聯筆記演算法推薦正確");

  // 清理測試臨時目錄
  fs.rmSync(tempVaultDir, { recursive: true, force: true });
  console.log("\n🎉 Phase 2 核心功能全部 5 項驗收測試 100% 通過！");
}

runTests().catch((err) => {
  console.error("❌ 測試失敗：", err);
  if (fs.existsSync(tempVaultDir)) {
    fs.rmSync(tempVaultDir, { recursive: true, force: true });
  }
  process.exit(1);
});
