/**
 * Copyright 2026 xx8897 and contributors
 * Phase 3 核心修復與全庫體檢工具驗收測試 (TDD Red-Green Verification)
 */

import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempVaultDir = path.join(__dirname, "temp-vault-phase3");

process.env.VAULT_PATH = tempVaultDir;

if (fs.existsSync(tempVaultDir)) {
  fs.rmSync(tempVaultDir, { recursive: true, force: true });
}
fs.mkdirSync(tempVaultDir, { recursive: true });

console.log("🧪 開始執行 Phase 3 核心安全修復與全庫體檢單元測試...\n");

async function runTests() {
  const { resolveSafePath, safeDecodeURI, SecurityViolationError } = await import("../dist/lib/security.js");
  const { extractBacklinksForTarget } = await import("../dist/tools/get-backlinks.js");
  const { computeVaultOverview, vaultOverview } = await import("../dist/tools/vault-overview.js");

  // ==========================================
  // 測試 1：等冪 URI 解碼防禦（多重編碼與畸形保護）
  // ==========================================
  console.log("▶️ 測試 1: 等冪 URI 解碼防禦 (多重編碼與畸形防護)");
  const multiEncoded = "%25252e%25252e%252fevil.md";
  const decoded = safeDecodeURI(multiEncoded);
  assert.strictEqual(decoded.includes(".."), true, "多次編碼應被等冪解碼為包含 .. 的實質路徑");

  let caughtMultiEscape = false;
  try {
    resolveSafePath(tempVaultDir, multiEncoded);
  } catch (err) {
    if (err instanceof SecurityViolationError || err.name === "SecurityViolationError") {
      caughtMultiEscape = true;
    }
  }
  assert.strictEqual(caughtMultiEscape, true, "多重編碼逃逸必須被安全守衛阻斷");

  // 測試畸形 URI 編碼不拋例外
  const malformed = "%ZZ%GG";
  const safeMalformed = safeDecodeURI(malformed);
  assert.strictEqual(typeof safeMalformed, "string", "畸形編碼應安全降級為字串，絕不崩潰");
  console.log("  ✅ 測試 1 通過：多重編碼穿透被成功阻斷，畸形編碼零崩潰");

  // ==========================================
  // 測試 2：Null Byte 空字元注入安全阻斷
  // ==========================================
  console.log("\n▶️ 測試 2: Null Byte 空字元注入安全阻斷");
  let caughtNullByte = false;
  try {
    resolveSafePath(tempVaultDir, "projects/%00/evil.md");
  } catch (err) {
    if (err.name === "SecurityViolationError" && err.message.includes("Null Byte")) {
      caughtNullByte = true;
    }
  }
  assert.strictEqual(caughtNullByte, true, "空字元注入必須在邊界觸發 SecurityViolationError");
  console.log("  ✅ 測試 2 通過：Null Byte 注入已被安全守衛在邊界直接阻斷");

  // ==========================================
  // 測試 3：連續多行雙向連結正則狀態隔離
  // ==========================================
  console.log("\n▶️ 測試 3: 連續多行雙向連結提取無狀態殘留");
  const multiLineContent = `
引用 1: [[target-core]]
引用 2: [[target-core]]
引用 3: [[target-core#標題]]
`;
  const extracted = extractBacklinksForTarget("target-core", "source.md", "Source", multiLineContent);
  assert.strictEqual(extracted.length, 3, "連續多行引用必須全部 100% 被提取，不得隔行漏失");
  console.log("  ✅ 測試 3 通過：正則狀態隔離完成，多行雙向連結全數命中");

  // ==========================================
  // 建立 Phase 3 測試 Vault 檔案
  // ==========================================
  // 檔案 1: projects/a/README.md (測試同名檔案)
  fs.mkdirSync(path.join(tempVaultDir, "projects", "a"), { recursive: true });
  fs.writeFileSync(
    path.join(tempVaultDir, "projects", "a", "README.md"),
    `---
title: Project A Readme
tags: [Architecture, mcp]
---
專案 A 說明文件。
`,
    "utf-8"
  );

  // 檔案 2: projects/b/README.md (同名檔案，指向專案 A)
  fs.mkdirSync(path.join(tempVaultDir, "projects", "b"), { recursive: true });
  fs.writeFileSync(
    path.join(tempVaultDir, "projects", "b", "README.md"),
    `---
title: Project B Readme
tags: [architecture, ARCHITECTURE]
---
專案 B 說明文件。
引用了專案 A：[[README]]。
另外引用了未建立的幽靈頁面：[[uncreated-ghost-page]]。
`,
    "utf-8"
  );

  // 檔案 3: solo.md (自我閉環孤島測試)
  fs.writeFileSync(
    path.join(tempVaultDir, "solo.md"),
    `---
title: Solo Note
tags: [isolated]
---
這是一篇只引用自己的閉環孤島：[[solo]]。
`,
    "utf-8"
  );

  // ==========================================
  // 測試 4：跨目錄同名檔案防覆蓋與統計完整度
  // ==========================================
  console.log("\n▶️ 測試 4: 跨目錄同名檔案 (projects/a/README 與 projects/b/README) 完整防覆蓋");
  const overview = await computeVaultOverview({ limit: 10 });
  assert.strictEqual(overview.totalNotes, 3, "總筆記數應為 3（同名檔案絕對不可被覆蓋抹除）");
  console.log("  ✅ 測試 4 通過：同名檔案完整保留獨立節點身份");

  // ==========================================
  // 測試 5：標籤大小寫強制正規化與單檔去重
  // ==========================================
  console.log("\n▶️ 測試 5: 標籤大小寫強制歸戶 (Architecture / architecture / ARCHITECTURE)");
  // 專案 A 有 [Architecture], 專案 B 有 [architecture, ARCHITECTURE]
  // 兩篇檔案各自去重後，architecture 標籤總計應剛好為 2（一篇一次）
  assert.strictEqual(overview.tagCounts["architecture"], 2, "同義標籤應完全聚合為同一小寫鍵值且單檔去重");
  assert.strictEqual(overview.tagCounts["Architecture"], undefined, "大寫標籤鍵值不應獨立存在");
  console.log("  ✅ 測試 5 通過：標籤大小寫已完全小寫化聚合");

  // ==========================================
  // 測試 6：自引用閉環正確歸類為導航孤島
  // ==========================================
  console.log("\n▶️ 測試 6: 自引用閉環孤島判定 (solo.md -> [[solo]])");
  const isSoloOrphan = overview.orphanNotes.some((n) => n.includes("solo.md"));
  assert.strictEqual(isSoloOrphan, true, "自我閉環筆記必須被正確識別為導航孤島");
  console.log("  ✅ 測試 6 通過：自我閉環無法欺騙孤島檢測演算法");

  // ==========================================
  // 測試 7：幽靈未建連結正確隔離，不污染沉澱筆記
  // ==========================================
  console.log("\n▶️ 測試 7: 幽靈未建連結 (uncreated-ghost-page) 隔離檢驗");
  assert.strictEqual(overview.danglingCount, 1, "應檢測到 1 處幽靈未建連結");
  assert.ok(overview.danglingLinks.includes("uncreated-ghost-page"), "幽靈連結名稱應符合");
  const isGhostInSinks = overview.sinkNotes.some((n) => n.includes("ghost"));
  assert.strictEqual(isGhostInSinks, false, "未建檔案絕對不可被誤報為實體沉澱筆記 (False Sink)");
  console.log("  ✅ 測試 7 通過：幽靈未建連結已被物理隔離於 danglingLinks");

  // ==========================================
  // 測試 8：Token 預算防護截斷與摘要輸出
  // ==========================================
  console.log("\n▶️ 測試 8: Token 預算防護截斷 (limit: 1)");
  const boundedText = await vaultOverview({ limit: 1 });
  assert.ok(boundedText.includes("📊 **Obsidian Vault 知識圖譜體檢總覽**"), "標題應存在");
  assert.ok(boundedText.includes("已省略"), "筆數超過 limit 時應出現省略文字保護 Token");
  console.log("  ✅ 測試 8 通過：Token 預算防護與格式化輸出驗證正常");

  // 清理測試臨時目錄
  fs.rmSync(tempVaultDir, { recursive: true, force: true });
  console.log("\n🎉 Phase 3 核心修復與全庫體檢全部 8 項單元測試 100% 通過！");
}

runTests().catch((err) => {
  console.error("❌ 測試失敗：", err);
  if (fs.existsSync(tempVaultDir)) {
    fs.rmSync(tempVaultDir, { recursive: true, force: true });
  }
  process.exit(1);
});
