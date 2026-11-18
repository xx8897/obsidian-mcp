/**
 * resolveSafePath 安全防禦單元驗證
 */
import { resolveSafePath, SecurityViolationError, sanitizeFolderName } from "../dist/lib/security.js";
import assert from "node:assert";
import path from "node:path";

console.log("🔒 開始執行 resolveSafePath 安全守衛防禦測試...");

const mockVault = "D:\\test-vault";

// 測試 1：合法內部子路徑正常放行
const safe1 = resolveSafePath(mockVault, "inbox/my-note.md");
assert.strictEqual(safe1, path.join(mockVault, "inbox", "my-note.md"));
console.log("  ✅ 測試 1 通過：合法子目錄正常放行");

// 測試 2：合法根目錄自身
const safe2 = resolveSafePath(mockVault, "");
assert.strictEqual(safe2, mockVault);
console.log("  ✅ 測試 2 通過：根目錄自身安全通過");

// 測試 3：惡意路徑穿透攻擊必須被攔截拋出 SecurityViolationError
let caught = false;
try {
  resolveSafePath(mockVault, "../../Windows/System32/calc.exe");
} catch (err) {
  if (err instanceof SecurityViolationError) {
    caught = true;
  }
}
assert.strictEqual(caught, true, "致命漏洞：非法逃逸路徑竟然未被攔截！");
console.log("  ✅ 測試 3 通過：惡意 ../ 逃逸攻擊被成功物理阻斷");

// 測試 4：清理非法資料夾字元並合併多餘短橫線
const cleanFolder = sanitizeFolderName("projects/bad:name*<tag>?");
assert.strictEqual(cleanFolder, path.join("projects", "bad-name-tag-"));
console.log("  ✅ 測試 4 通過：資料夾名稱非法字元過濾正常");

console.log("\n🎉 所有安全防護測試 100% 通過！");
