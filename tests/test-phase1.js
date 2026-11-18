/**
 * Copyright 2026 xx8897 and contributors
 * Phase 1 核心功能單元驗收測試 (TDD Red-Green Verification)
 */

import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempVaultDir = path.join(__dirname, "temp-vault-test");

// 設定測試環境變數
process.env.VAULT_PATH = tempVaultDir;

// 清理與初始化測試 Vault
if (fs.existsSync(tempVaultDir)) {
  fs.rmSync(tempVaultDir, { recursive: true, force: true });
}
fs.mkdirSync(tempVaultDir, { recursive: true });

console.log("🧪 開始執行 Phase 1 核心功能單元測試...");

async function runTests() {
  const { addNote } = await import("../dist/tools/add-note.js");
  const { appendNote } = await import("../dist/tools/append-note.js");
  const { updateFrontmatter } = await import("../dist/tools/update-frontmatter.js");
  const { readNote } = await import("../dist/lib/frontmatter.js");

  // 測試 1：add_note 支援自訂多層目錄
  console.log("\n▶️ 測試 1: 建立自訂目錄筆記 (folder: 'projects/cdp')");
  const res1 = await addNote({
    title: "architecture-v2",
    content: "這是 CDP 核心架構筆記。\n\n## 待辦事項\n- 項目 A",
    folder: "projects/cdp",
    tags: ["architecture", "cdp"],
  });
  const createdPath = path.join(tempVaultDir, "projects", "cdp", "architecture-v2.md");
  assert.strictEqual(fs.existsSync(createdPath), true, "檔案應成功建立在自訂目錄下");
  const parsed1 = readNote(createdPath);
  assert.strictEqual(parsed1.frontmatter.title, "architecture-v2");
  assert.deepStrictEqual(parsed1.frontmatter.tags, ["architecture", "cdp"]);
  console.log("  ✅ 測試 1 通過：自訂目錄與 Frontmatter 建立正常");

  // 測試 2：append_to_note 末尾安全追加
  console.log("\n▶️ 測試 2: append_to_note 未指定章節，末尾直接追加");
  await appendNote({
    path: "projects/cdp/architecture-v2.md",
    content: "\n\n## 新增章節\n這是末尾追加的內容。",
  });
  const raw2 = fs.readFileSync(createdPath, "utf-8");
  assert.ok(raw2.includes("這是末尾追加的內容。"), "末尾追加內容應存在");
  assert.ok(raw2.includes("這是 CDP 核心架構筆記。"), "原有筆記內容必須完整保留");
  console.log("  ✅ 測試 2 通過：末尾追加無損原有正文");

  // 測試 3：append_to_note 在指定 targetHeading 下精準插入
  console.log("\n▶️ 測試 3: append_to_note 指定 targetHeading: '## 待辦事項'");
  await appendNote({
    path: "projects/cdp/architecture-v2.md",
    targetHeading: "## 待辦事項",
    content: "- 項目 B (精準插入)",
  });
  const raw3 = fs.readFileSync(createdPath, "utf-8");
  assert.ok(raw3.includes("- 項目 B (精準插入)"), "章節插入內容應存在");
  // 驗證插入順序：項目 B 應出現在 ## 待辦事項 下方、且在 ## 新增章節 上方
  const idxHeading = raw3.indexOf("## 待辦事項");
  const idxItemB = raw3.indexOf("- 項目 B (精準插入)");
  const idxNewSec = raw3.indexOf("## 新增章節");
  assert.ok(idxHeading < idxItemB && idxItemB < idxNewSec, "插入位置順序必須嚴格精確");
  console.log("  ✅ 測試 3 通過：章節精確插入順序完美無誤");

  // 測試 4：update_frontmatter 原地增修標籤與狀態
  console.log("\n▶️ 測試 4: update_frontmatter 增加標籤與設定狀態");
  await updateFrontmatter({
    path: "projects/cdp/architecture-v2.md",
    addTags: ["milestone-1", "verified"],
    removeTags: ["architecture"],
    status: "in-progress",
  });
  const parsed4 = readNote(createdPath);
  assert.ok(parsed4.frontmatter.tags.includes("milestone-1"), "應成功加入 milestone-1");
  assert.ok(parsed4.frontmatter.tags.includes("verified"), "應成功加入 verified");
  assert.strictEqual(parsed4.frontmatter.tags.includes("architecture"), false, "應成功移除 architecture");
  assert.strictEqual(parsed4.frontmatter.status, "in-progress", "status 應更新為 in-progress");
  assert.ok(parsed4.content.includes("這是末尾追加的內容。"), "正文內容絕對不可受損");
  console.log("  ✅ 測試 4 通過：Frontmatter 原地增修成功，正文完全無損");

  // 測試 5：惡意逃逸路徑檢驗
  console.log("\n▶️ 測試 5: 惡意路徑逃逸防禦");
  let caughtEscape = false;
  try {
    await appendNote({
      path: "../../../evil.md",
      content: "駭客攻擊內文",
    });
  } catch (err) {
    caughtEscape = true;
  }
  assert.strictEqual(caughtEscape, true, "惡意 ../ 逃逸路徑必須被安全阻斷");
  console.log("  ✅ 測試 5 通過：惡意路徑穿透已被物理阻斷");

  // 清理測試臨時目錄
  fs.rmSync(tempVaultDir, { recursive: true, force: true });
  console.log("\n🎉 Phase 1 核心功能全部 5 項驗收測試 100% 通過！");
}

runTests().catch((err) => {
  console.error("❌ 測試失敗：", err);
  if (fs.existsSync(tempVaultDir)) {
    fs.rmSync(tempVaultDir, { recursive: true, force: true });
  }
  process.exit(1);
});
