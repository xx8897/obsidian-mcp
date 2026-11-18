/**
 * Copyright 2026 xx8897 and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * @canary: obsidian-mcp-xx8897-vault-core
 */

import * as fs from "fs";
import * as path from "path";
import { resolveSafePath, sanitizeFolderName } from "./security.js";

/**
 * 取得 Vault 根目錄的絕對路徑
 */
export function getVaultPath(): string {
  const vaultPath = process.env.VAULT_PATH;
  if (!vaultPath) {
    throw new Error("[obsidian-mcp] 錯誤：請設定環境變數 VAULT_PATH");
  }
  return path.resolve(vaultPath);
}

/**
 * 透過安全守衛取得 Vault 內檔案的安全絕對路徑
 * 若路徑試圖逃逸 Vault 根目錄，將直接拋出安全違規阻斷
 */
export function getSafeFilePath(relativePath: string): string {
  return resolveSafePath(getVaultPath(), relativePath);
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
 * 同目錄極簡原子寫入：先寫入同目錄暫存檔再 rename 覆蓋，避免寫入撕裂與並發鎖定衝突
 */
export function atomicWriteFileSync(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  try {
    fs.writeFileSync(tempPath, content, "utf-8");
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // 忽略暫存檔清除異常
      }
    }
    throw err;
  }
}

/**
 * 統一正規化標籤解析：支援字串 (逗號/空白分隔)、陣列、帶 # 與不帶 # 格式
 */
export function extractNormalizedTags(tagsInput: unknown): string[] {
  if (!tagsInput) return [];
  const result: string[] = [];
  const rawList: string[] = [];

  if (Array.isArray(tagsInput)) {
    for (const item of tagsInput) {
      if (typeof item === "string") {
        rawList.push(item);
      }
    }
  } else if (typeof tagsInput === "string") {
    rawList.push(...tagsInput.split(/[, ]+/));
  }

  for (const raw of rawList) {
    const clean = raw.trim().replace(/^#+/, "").toLowerCase();
    if (clean && !result.includes(clean)) {
      result.push(clean);
    }
  }

  return result;
}

/**
 * 移除 Markdown 中的程式碼區塊 (``` ... ``` 或 ~~~ ... ~~~) 與行內代碼 (`...`)
 */
export function stripCodeBlocks(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "")
    .replace(/`[^`\n]*`/g, "");
}

/**
 * 從筆記內文中提取所有 Wikilinks 目標標題集合（自動屏蔽程式碼區塊中的假連結）
 */
export function extractOutgoingLinks(content: string): Set<string> {
  const links = new Set<string>();
  const sanitizedContent = stripCodeBlocks(content);
  const wikilinkRegex = /\[\[(.*?)\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = wikilinkRegex.exec(sanitizedContent)) !== null) {
    const rawTarget = match[1].split("|")[0].split("#")[0].trim();
    if (rawTarget) {
      links.add(path.basename(rawTarget, ".md").toLowerCase());
    }
  }

  return links;
}

/**
 * 遞迴取得指定目錄下所有 .md 檔案的完整路徑清單
 * 自動略過 .obsidian, .git, node_modules 等系統目錄
 */
export function getAllMdFiles(dir: string): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    // 略過以 . 開頭的隱藏目錄 (如 .obsidian, .git) 或 node_modules
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllMdFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }

  return results;
}

export { resolveSafePath, sanitizeFolderName };
