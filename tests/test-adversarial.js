/**
 * Adversarial Interrogation Test Suite
 * 多重視角極限壓力測試與邊界質詢 (Interrogate Probe)
 */

import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = path.join(__dirname, "temp-vault-adversarial");

process.env.VAULT_PATH = tempDir;

if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

async function runAdversarialProbes() {
  console.log("⚔️ 開始執行 /interrogate 多視角極限壓力測試...\n");

  const { resolveSafePath } = await import("../dist/lib/security.js");
  const { appendNote } = await import("../dist/tools/append-note.js");
  const { updateFrontmatter } = await import("../dist/tools/update-frontmatter.js");
  const { getBacklinks } = await import("../dist/tools/get-backlinks.js");
  const { findRelatedNotes } = await import("../dist/tools/find-related.js");
  const { readNote } = await import("../dist/lib/frontmatter.js");

  // ==========================================
  // Adversary 1: 穿透攻擊者 (URL-Encoded Path Traversal)
  // ==========================================
  console.log("▶️ [Adversary 1: 穿透攻擊] URL 編碼路徑逃逸測試");
  const urlEncodedEscape = "%2e%2e%2f%2e%2e%2fevil.md";
  let adv1Caught = false;
  let adv1Output = "";
  try {
    const res = resolveSafePath(tempDir, urlEncodedEscape);
    adv1Output = `ALLOWED: ${urlEncodedEscape} -> ${res}`;
  } catch (err) {
    adv1Caught = true;
    adv1Output = err.message;
  }
  console.log("  Adversary 1 結果:", adv1Output);

  // ==========================================
  // Adversary 2: 格式攻擊者 (無 Frontmatter 筆記原地升級)
  // ==========================================
  console.log("\n▶️ [Adversary 2: 格式混亂] 無 Frontmatter 筆記原地更新測試");
  const rawFile = path.join(tempDir, "raw-note.md");
  fs.writeFileSync(rawFile, "# 原始標題\n這是沒有 Frontmatter 的純文字筆記。", "utf-8");

  await updateFrontmatter({
    path: "raw-note.md",
    addTags: ["p0", "verified"],
    status: "active",
  });

  const parsedRaw = readNote(rawFile);
  const adv2Success =
    Array.isArray(parsedRaw.frontmatter.tags) &&
    parsedRaw.frontmatter.status === "active" &&
    parsedRaw.content.includes("這是沒有 Frontmatter 的純文字筆記。");
  console.log("  Adversary 2 結果: 正文與元數據更新狀態 =", adv2Success ? "綠燈 (Safe)" : "失敗 (Broken)");

  // ==========================================
  // Adversary 3: 正則破壞者 (含正則符號標題之精確插入)
  // ==========================================
  console.log("\n▶️ [Adversary 3: 正則破壞] targetHeading 含 [ ( * + ? $ ^ 符號插入");
  const complexHeadingFile = path.join(tempDir, "complex-headings.md");
  fs.writeFileSync(
    complexHeadingFile,
    `---
title: Complex Headings
---

## 正常章節
內文 1

## 行動清單 (緊急) [P0] *必看*?
- 舊任務 A

## 下一章節
內文 2
`,
    "utf-8"
  );

  let adv3Success = false;
  try {
    await appendNote({
      path: "complex-headings.md",
      targetHeading: "## 行動清單 (緊急) [P0] *必看*?",
      content: "- 新任務 B (正則符號相容)",
    });

    const rawComplex = fs.readFileSync(complexHeadingFile, "utf-8");
    const idxA = rawComplex.indexOf("- 舊任務 A");
    const idxB = rawComplex.indexOf("- 新任務 B (正則符號相容)");
    const idxNext = rawComplex.indexOf("## 下一章節");
    adv3Success = idxA < idxB && idxB < idxNext;
  } catch (err) {
    console.error("  Adversary 3 異常:", err);
  }
  console.log("  Adversary 3 結果: 特殊符號標題插入順序 =", adv3Success ? "綠燈 (Safe)" : "失敗 (Broken)");

  // ==========================================
  // Adversary 4: 雙向連結變形語法攻擊者 (Wikilinks Deep Syntax)
  // ==========================================
  console.log("\n▶️ [Adversary 4: 雙向連結語法] 錨點、別名、多層路徑與管線符號反向檢索");
  const refFile = path.join(tempDir, "reference.md");
  fs.writeFileSync(
    refFile,
    `---
title: Reference Hub
---

引用 1: [[target-core]]
引用 2: [[target-core#架構設計]]
引用 3: [[target-core#架構設計|自訂顯示名稱]]
引用 4: [[projects/sub/target-core|別名路徑]]
引用 5: [[target-core|具有 | 管線符號的別名]]
`,
    "utf-8"
  );

  const backlinksFound = await getBacklinks({ title: "target-core" });
  const adv4Count = (backlinksFound.match(/- \*\*Reference Hub\*\*/g) || []).length;
  console.log(`  Adversary 4 結果: 5 處複雜語法引用，命中數量 = ${adv4Count}/5`);

  // ==========================================
  // Adversary 5: 零特徵孤立筆記攻擊者 (Zero-Feature Jaccard)
  // ==========================================
  console.log("\n▶️ [Adversary 5: 零特徵崩潰] 零標籤零雙鏈筆記關聯推薦");
  const emptyNote = path.join(tempDir, "empty-features.md");
  fs.writeFileSync(emptyNote, "純正文，沒有任何 frontmatter 標籤，也沒有任何中括號連結。", "utf-8");

  let adv5Output = "";
  try {
    adv5Output = await findRelatedNotes({ path: "empty-features.md" });
  } catch (err) {
    adv5Output = `ERROR: ${err.message}`;
  }
  console.log("  Adversary 5 結果:", adv5Output);

  // 清理測試臨時目錄
  fs.rmSync(tempDir, { recursive: true, force: true });
}

runAdversarialProbes().catch((err) => {
  console.error("❌ 執行失敗：", err);
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  process.exit(1);
});
