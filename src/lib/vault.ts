import * as fs from "fs";
import * as path from "path";

// 從環境變數取得 Vault 根目錄路徑
const VAULT_PATH = process.env.VAULT_PATH;

if (!VAULT_PATH) {
  console.error("[obsidian-mcp] 錯誤：請設定環境變數 VAULT_PATH");
  process.exit(1);
}

/**
 * 取得 Vault 根目錄的絕對路徑
 */
export function getVaultPath(): string {
  return path.resolve(VAULT_PATH!);
}

/**
 * 確保目錄存在（若不存在則遞迴建立）
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 取得今天的日期字串，格式：YYYY-MM-DD
 */
export function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * 將標題轉為安全的檔名（移除不合法字元）
 */
export function titleToFilename(title: string): string {
  return title
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .trim();
}

/**
 * 遞迴取得指定目錄下所有 .md 檔案的完整路徑清單
 */
export function getAllMdFiles(dir: string): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    // 略過 Obsidian 設定資料夾
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllMdFiles(fullPath));
    } else if (entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }

  return results;
}
