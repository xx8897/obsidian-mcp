/**
 * Copyright 2026 xx8897 and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * @canary: obsidian-mcp-xx8897-tool-search-notes
 */

import * as path from "path";
import {
  getVaultPath,
  getAllMdFiles,
  getSafeFilePath,
  sanitizeFolderName,
  extractNormalizedTags,
} from "../lib/vault.js";
import { readNote } from "../lib/frontmatter.js";
import { SearchNotesArgs } from "../types.js";

export const searchNotesSchema = {
  name: "search_notes",
  description: "全文檢索 Obsidian Vault 中所有筆記，支援標籤過濾、目錄限定與 Token 預算防護",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "搜尋關鍵字",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "限定符合之標籤清單（可選）",
      },
      folder: {
        type: "string",
        description: "限定搜尋之子資料夾（可選）",
      },
      limit: {
        type: "number",
        description: "最大回傳結果數量（預設 10）",
      },
    },
    required: ["query"],
  },
};

export async function searchNotes(args: SearchNotesArgs): Promise<string> {
  const vaultPath = getVaultPath();
  const scanDir = args.folder
    ? getSafeFilePath(sanitizeFolderName(args.folder))
    : vaultPath;

  const files = getAllMdFiles(scanDir);
  const keyword = args.query.toLowerCase();
  const limit = typeof args.limit === "number" && args.limit > 0 ? args.limit : 10;
  const filterTags = Array.isArray(args.tags)
    ? args.tags.map((t) => t.trim().replace(/^#/, "").toLowerCase())
    : [];

  const results: string[] = [];

  for (const filePath of files) {
    try {
      const { frontmatter, content } = readNote(filePath);

      // 標籤篩選
      if (filterTags.length > 0) {
        const noteTags = extractNormalizedTags(frontmatter.tags);
        const hasMatchingTag = filterTags.some((ft) => noteTags.includes(ft));
        if (!hasMatchingTag) continue;
      }

      const title = (frontmatter.title as string) ?? path.basename(filePath, ".md");
      const fullText = `${title} ${content}`.toLowerCase();

      if (fullText.includes(keyword)) {
        const rel = path.relative(vaultPath, filePath).replace(/\\/g, "/");

        // 擷取關鍵字周圍的文字作為摘要（受控長度）
        const idx = content.toLowerCase().indexOf(keyword);
        const start = Math.max(0, idx - 50);
        const end = Math.min(content.length, idx + 80);
        const excerpt =
          idx >= 0
            ? `...${content.slice(start, end).replace(/\r?\n+/g, " ")}...`
            : "(關鍵字出現在標題中)";

        results.push(`- **${title}**\n  📄 \`${rel}\`\n  > ${excerpt}`);

        if (results.length >= limit) {
          break;
        }
      }
    } catch {
      // 容錯跳過異常檔案
    }
  }

  if (results.length === 0) {
    return `🔍 找不到包含「${args.query}」的筆記。`;
  }

  return `🔍 搜尋「${args.query}」，找到 ${results.length} 則結果（顯示前 ${results.length} 則）：\n\n${results.join("\n\n")}`;
}
