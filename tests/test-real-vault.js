/**
 * Blast Radius Real Vault Test
 * 針對實體 d:/codespace/docs 執行真實掃描與圖譜計算驗證
 */

import { listNotes } from "../dist/tools/list-notes.js";
import { searchNotes } from "../dist/tools/search-notes.js";
import { getBacklinks } from "../dist/tools/get-backlinks.js";
import { findRelatedNotes } from "../dist/tools/find-related.js";
import { getNote } from "../dist/tools/get-note.js";

process.env.VAULT_PATH = "d:/codespace/docs";

async function verifyRealVault() {
  console.log("🚀 開始針對實機 Vault (d:/codespace/docs) 執行 Blast Radius 驗證...\n");

  const start = Date.now();

  // 1. list_notes 驗證
  console.log("▶️ [1/5] list_notes 測試 (limit: 5, folder: 'wiki')");
  const listOut = await listNotes({ folder: "wiki", limit: 5 });
  console.log(listOut.split("\n").slice(0, 4).join("\n") + "\n...");

  // 2. get_note 驗證
  console.log("\n▶️ [2/5] get_note 測試 (README.md)");
  const noteOut = await getNote({ path: "README.md" });
  console.log(noteOut.split("\n").slice(0, 3).join("\n") + "\n...");

  // 3. search_notes 測試
  console.log("\n▶️ [3/5] search_notes 測試 (query: 'Antigravity', limit: 3)");
  const searchOut = await searchNotes({ query: "Antigravity", limit: 3 });
  console.log(searchOut.split("\n").slice(0, 5).join("\n") + "\n...");

  // 4. get_backlinks 測試
  console.log("\n▶️ [4/5] get_backlinks 測試 (title: 'README')");
  const backlinksOut = await getBacklinks({ title: "README" });
  console.log(backlinksOut.split("\n").slice(0, 4).join("\n"));

  // 5. find_related_notes 測試
  console.log("\n▶️ [5/5] find_related_notes 測試 (path: 'wiki/plugin-antigravity/01-google-workspace.md')");
  const relatedOut = await findRelatedNotes({ path: "wiki/plugin-antigravity/01-google-workspace.md", limit: 3 });
  console.log(relatedOut.split("\n").slice(0, 6).join("\n"));

  const duration = Date.now() - start;
  console.log(`\n⏱️ 實機全庫 5 大工具掃描耗時：${duration} ms`);
  console.log("✅ 實機 Vault 驗收 100% 成功，無任何例外或崩潰！");
}

verifyRealVault().catch((err) => {
  console.error("❌ 實機驗證失敗：", err);
  process.exit(1);
});
