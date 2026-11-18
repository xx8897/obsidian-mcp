/**
 * Copyright 2026 xx8897 and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * @canary: obsidian-mcp-xx8897-security-guard
 */

import * as path from "path";

/**
 * 安全違規例外（當檢測到路徑逃逸攻擊時拋出）
 */
export class SecurityViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecurityViolationError";
  }
}

/**
 * 嚴密校驗相對路徑是否合法位於 Vault 根目錄內，物理杜絕 ../ 逃逸攻擊
 * 
 * @param vaultRoot Vault 根目錄絕對路徑
 * @param relativePath 欲存取之相對檔案或資料夾路徑
 * @returns 經安全解析之目標絕對路徑
 * @throws {SecurityViolationError} 當路徑試圖跳出 Vault 邊界時拋出
 */
export function resolveSafePath(vaultRoot: string, relativePath: string): string {
  const normalizedRoot = path.resolve(vaultRoot);
  // 防止空路徑或非字串
  const cleanRel = (relativePath || "").trim();
  const targetPath = path.resolve(normalizedRoot, cleanRel);

  // 必須以 normalizedRoot + path.sep 開頭，或者剛好等於 normalizedRoot 本身
  const isInside =
    targetPath === normalizedRoot ||
    targetPath.startsWith(normalizedRoot + path.sep);

  if (!isInside) {
    throw new SecurityViolationError(
      `[安全防禦攔截] 檢測到非法路徑穿透嘗試: "${relativePath}" 試圖逃逸 Vault 根目錄！操作已物理強制阻斷。`
    );
  }

  return targetPath;
}

/**
 * 驗證並清理子資料夾名稱（避免非法字元）
 */
export function sanitizeFolderName(folder: string): string {
  return folder
    .split(/[\\/]/)
    .map((segment) =>
      segment
        .replace(/[<>:"|?*]/g, "-")
        .replace(/\s+/g, " ")
        .replace(/-+/g, "-")
        .trim()
    )
    .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..")
    .join(path.sep);
}
