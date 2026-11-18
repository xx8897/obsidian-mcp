/**
 * Copyright 2026 xx8897 and contributors
 * Phase 4 核心安全加固與回饋修復單元測試 (TDD Green Verification)
 * 驗收範圍：程式碼區塊標題誤判、原子寫入、反向連結 Token 預算上限、直接引用圖譜計算、標籤正規化
 */

import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempVaultDir = path.join(__dirname, "temp-vault-phase4");

process.env.VAULT_PATH = tempVaultDir;

if (fs.existsSync(tempVaultDir)) {
  fs.rmSync(tempVaultDir, { recursive: true, force: true });
}
fs.mkdirSync(tempVaultDir, { recursive: true });

console.log("🧪 開始執行 Phase 4 核心加固與審查修復單元測試...\n");

async function runTests() {
  const { atomicWriteFileSync, extractNormalizedTags } = await import("../dist/lib/vault.js");
  const { appendNote } = await import("../dist/tools/append-note.js");
  const { getBacklinks } = await import("../dist/tools/get-backlinks.js");
  const { findRelatedNotes } = await import("../dist/tools/find-related.js");
  const { listNotes } = await import("../dist/tools/list-notes.js");
  const { searchNotes } = await import("../dist/tools/search-notes.js");

  // ==========================================
  // 測試 1：append_to_note 程式碼區塊標題誤判防禦
  // ==========================================
  console.log("▶️ 測試 1: append_to_note 屏蔽程式碼區塊中的假標題");
  const codeBlockNotePath = path.join(tempVaultDir, "codeblock-test.md");
  const initialContent = [
    "# 主筆記標題",
    "",
    "```python",
    "# 待辦事項 (This is inside a python code block)",
    "x = 10",
    "```",
    "",
    "## 待辦事項",
    "- [x] 原始任務 1",
    "",
    "## 結尾章節",
    "一些結尾說明",
  ].join("\n");

  fs.writeFileSync(codeBlockNotePath, initialContent, "utf-8");

  await appendNote({
    path: "codeblock-test.md",
    content: "- [ ] 真正追加的新任務",
    targetHeading: "待辦事項",
  });

  const updatedContent = fs.readFileSync(codeBlockNotePath, "utf-8");
  assert.strictEqual(
    updatedContent.includes("x = 10\n```"),
    true,
    "Python 程式碼區塊應保持完整未被破壞"
  );
  assert.strictEqual(
    updatedContent.includes("- [x] 原始任務 1\n- [ ] 真正追加的新任務"),
    true,
    "新任務必須準確追加在 Markdown 真實標題下方，而非誤插入至程式碼區塊內"
  );
  console.log("  ✅ 測試 1 通過：程式碼區塊內部註解被正確忽略，內容準確插入真實標題章節");

  // ==========================================
  // 測試 2：get_backlinks 支援 limit 參數與 Token 預算防護
  // ==========================================
  console.log("\n▶️ 測試 2: get_backlinks 支援 limit 參數與截斷提示");
  const targetNotePath = path.join(tempVaultDir, "target-note.md");
  fs.writeFileSync(targetNotePath, "# 目標筆記\n\n內容", "utf-8");

  for (let i = 1; i <= 3; i++) {
    fs.writeFileSync(
      path.join(tempVaultDir, `ref-note-${i}.md`),
      `# 引用筆記 ${i}\n\n這篇引用了 [[target-note]]。`,
      "utf-8"
    );
  }

  const backlinksResult = await getBacklinks({
    title: "target-note",
    limit: 2,
  });

  assert.strictEqual(backlinksResult.includes("共找到 3 處引用"), true, "應準確統計總命中數為 3 處");
  assert.strictEqual(
    backlinksResult.includes("僅顯示前 2 則結果（其餘 1 處引用已受 Token 預算防護省略）。"),
    true,
    "應輸出截斷提示以保護 LLM Context Window"
  );
  console.log("  ✅ 測試 2 通過：limit 筆數控制與截斷提示完全符合預期");

  // ==========================================
  // 測試 3：find_related_notes 一階直接圖譜關聯 (Graph Distance = 1)
  // ==========================================
  console.log("\n▶️ 測試 3: find_related_notes 一階直接雙向連結關聯計算");
  const linkSourcePath = path.join(tempVaultDir, "source-note.md");
  const linkDestPath = path.join(tempVaultDir, "dest-note.md");

  // 兩篇筆記無共有標籤，僅有 source 引用 dest
  fs.writeFileSync(linkSourcePath, "# 來源筆記\n\n強烈推薦閱讀 [[dest-note]] 架構設計。", "utf-8");
  fs.writeFileSync(linkDestPath, "---\ntitle: 目標架構筆記\n---\n# 目標架構筆記\n\n獨立架構文檔內容。", "utf-8");

  const relatedResult = await findRelatedNotes({
    path: "source-note.md",
  });

  assert.strictEqual(
    relatedResult.includes("dest-note.md"),
    true,
    "一階直接引用的筆記即使沒有共同標籤，也必須被列為推薦關聯"
  );
  assert.strictEqual(
    relatedResult.includes("直接引用 ➔ [[目標架構筆記]]"),
    true,
    "推薦理由中應清楚說明直接引用關係"
  );
  console.log("  ✅ 測試 3 通過：一階直接連結被成功賦予邊權重並納入關聯推薦");

  // ==========================================
  // 測試 4：標籤正規化 (字串/逗號分隔/陣列) 整合搜尋驗證
  // ==========================================
  console.log("\n▶️ 測試 4: 標籤正規化支援字串與陣列統一搜尋");
  const taggedNotePath = path.join(tempVaultDir, "tagged-note.md");
  const taggedNoteContent = [
    "---",
    'title: "標籤測試筆記"',
    'tags: "architecture, ai, #obsidian"',
    "---",
    "# 標籤測試筆記內容",
  ].join("\n");
  fs.writeFileSync(taggedNotePath, taggedNoteContent, "utf-8");

  // 測試 extractNormalizedTags 核心函式
  const normalized = extractNormalizedTags("architecture, ai, #obsidian");
  assert.deepStrictEqual(normalized, ["architecture", "ai", "obsidian"]);

  // 測試 listNotes 篩選
  const listAiResult = await listNotes({ tag: "ai" });
  assert.strictEqual(listAiResult.includes("tagged-note.md"), true, "listNotes 應能篩選出逗號字串定義的標籤");

  // 測試 searchNotes 標籤過濾
  const searchResult = await searchNotes({ query: "測試", tags: ["#obsidian"] });
  assert.strictEqual(searchResult.includes("tagged-note.md"), true, "searchNotes 應能以去除 # 後的標籤匹配");
  console.log("  ✅ 測試 4 通過：標籤字串與陣列均被正確正規化，查詢過濾精確命中");

  // ==========================================
  // 測試 5：atomicWriteFileSync 原子寫入與零殘留驗證
  // ==========================================
  console.log("\n▶️ 測試 5: atomicWriteFileSync 原子安全寫入與暫存檔清除");
  const atomicTarget = path.join(tempVaultDir, "atomic-test.md");
  atomicWriteFileSync(atomicTarget, "Atomic Content 12345");

  assert.strictEqual(fs.existsSync(atomicTarget), true, "目標檔案應成功寫入");
  assert.strictEqual(fs.readFileSync(atomicTarget, "utf-8"), "Atomic Content 12345");

  // 檢查同目錄下是否存在任何殘留的 .tmp 暫存檔案
  const tempFiles = fs.readdirSync(tempVaultDir).filter((f) => f.includes(".tmp."));
  assert.strictEqual(tempFiles.length, 0, "原子寫入後不應殘留任何 .tmp 臨時檔案");
  console.log("  ✅ 測試 5 通過：原子寫入成功且目錄乾淨零殘留");

  // 清理測試目錄
  fs.rmSync(tempVaultDir, { recursive: true, force: true });
  console.log("\n✨ 全部 Phase 4 加固測試 100% 通過！");
}

runTests().catch((err) => {
  console.error("❌ 測試失敗：", err);
  process.exit(1);
});
