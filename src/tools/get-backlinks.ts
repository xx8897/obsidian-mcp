/**
 * Copyright 2026 xx8897 and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * @canary: obsidian-mcp-xx8897-tool-get-backlinks
 */

import * as path from "path";
import { getVaultPath, getAllMdFiles } from "../lib/vault.js";
import { readNote } from "../lib/frontmatter.js";
import { GetBacklinksArgs, BacklinkItem } from "../types.js";

export const getBacklinksSchema = {
  name: "get_backlinks",
  description: "反向連結檢索：查詢全 Vault 中有哪些其他筆記透過 [[目標筆記]] 引用了此篇筆記",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: {
        type: "string",
        description: "目標筆記標題或檔名（例如：'cdp-mcp' 或 'note-b'）",
      },
    },
    required: ["title"],
  },
};

/**
 * 移除 Markdown 中的程式碼區塊 (``` ... ```) 與行內代碼 (`...`)，防止範例程式碼被誤判為雙向連結
 */
export function stripCodeBlocks(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "");
}

/**
 * 從文字內容中提取指定筆記的所有反向連結引用條目
 */
export function extractBacklinksForTarget(
  targetTitle: string,
  sourceRelPath: string,
  sourceTitle: string,
  content: string
): BacklinkItem[] {
  const cleanTarget = targetTitle.trim().replace(/\.md$/, "").toLowerCase();
  const sanitizedContent = stripCodeBlocks(content);
  const lines = sanitizedContent.split(/\r?\n/);
  const items: BacklinkItem[] = [];

  for (const line of lines) {
    // 每次掃描新行時使用獨立無狀態正則，徹底杜絕 lastIndex 跨行殘留
    const lineRegex = /\[\[(.*?)\]\]/g;
    let match: RegExpExecArray | null;
    while ((match = lineRegex.exec(line)) !== null) {
      const linkBody = match[1];
      const linkTarget = linkBody.split("|")[0].split("#")[0].trim();
      const targetBase = path.basename(linkTarget, ".md").toLowerCase();

      if (linkTarget.toLowerCase() === cleanTarget || targetBase === cleanTarget) {
        items.push({
          sourcePath: sourceRelPath,
          sourceTitle,
          snippet: line.trim(),
        });
        break; // 同一行命中一次即可
      }
    }
  }

  return items;
}

export async function getBacklinks(args: GetBacklinksArgs): Promise<string> {
  const vaultPath = getVaultPath();
  const files = getAllMdFiles(vaultPath);
  const targetTitle = args.title.trim();
  const allBacklinks: BacklinkItem[] = [];

  for (const filePath of files) {
    try {
      const relPath = path.relative(vaultPath, filePath).replace(/\\/g, "/");
      const { frontmatter, content } = readNote(filePath);
      const title = (frontmatter.title as string) ?? path.basename(filePath, ".md");

      // 自己對自己的引用不列為反向連結
      if (title.toLowerCase() === targetTitle.toLowerCase()) {
        continue;
      }

      const found = extractBacklinksForTarget(targetTitle, relPath, title, content);
      allBacklinks.push(...found);
    } catch {
      // 容錯跳過異常檔案
    }
  }

  if (allBacklinks.length === 0) {
    return `📭 在全 Vault 中找不到任何引用「${targetTitle}」的反向連結筆記。`;
  }

  const results = allBacklinks.map(
    (item) => `- **${item.sourceTitle}** (\`${item.sourcePath}\`)\n  > ${item.snippet}`
  );

  return `🔗 共找到 ${allBacklinks.length} 處引用「${targetTitle}」的反向連結：\n\n${results.join("\n\n")}`;
}
