/**
 * Copyright 2026 xx8897 and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * @canary: obsidian-mcp-xx8897-tool-list-notes
 */

import * as path from "path";
import { getVaultPath, getAllMdFiles, getSafeFilePath, sanitizeFolderName } from "../lib/vault.js";
import { readNote } from "../lib/frontmatter.js";
import { ListNotesArgs } from "../types.js";

export const listNotesSchema = {
  name: "list_notes",
  description: "列出 Obsidian Vault 中筆記清單，支援目錄限定、標籤篩選與筆數上限保護",
  inputSchema: {
    type: "object" as const,
    properties: {
      folder: {
        type: "string",
        description: "限定掃描的子資料夾（例如 'projects/cdp' 或 'inbox'）",
      },
      tag: {
        type: "string",
        description: "限定篩選的標籤（例如 'architecture'）",
      },
      limit: {
        type: "number",
        description: "最大回傳筆數上限（預設為 50，防止 Token 消耗過大）",
      },
    },
    required: [],
  },
};

export async function listNotes(args: ListNotesArgs): Promise<string> {
  const vaultPath = getVaultPath();
  const scanDir = args.folder
    ? getSafeFilePath(sanitizeFolderName(args.folder))
    : vaultPath;

  const files = getAllMdFiles(scanDir);

  if (files.length === 0) {
    return "📭 找不到任何符合條件的筆記。";
  }

  const queryTag = args.tag ? args.tag.trim().replace(/^#/, "").toLowerCase() : null;
  const limit = typeof args.limit === "number" && args.limit > 0 ? args.limit : 50;

  const matchedNotes: string[] = [];

  for (const filePath of files) {
    const rel = path.relative(vaultPath, filePath).replace(/\\/g, "/");
    try {
      const { frontmatter } = readNote(filePath);
      const tagsList = Array.isArray(frontmatter.tags)
        ? frontmatter.tags.map((t) => String(t).trim().replace(/^#/, ""))
        : [];

      // 若指定標籤，檢驗是否匹配
      if (queryTag && !tagsList.some((t) => t.toLowerCase() === queryTag)) {
        continue;
      }

      const title = (frontmatter.title as string) ?? path.basename(filePath, ".md");
      const tagsDisplay = tagsList.length > 0 ? tagsList.join(", ") : "-";
      const date = (frontmatter.date as string) ?? "-";
      const status = (frontmatter.status as string) ?? "";
      const statusDisplay = status ? ` | 📌 ${status}` : "";

      matchedNotes.push(`- **${title}** | 📅 ${date} | 🏷️ ${tagsDisplay}${statusDisplay}\n  📄 \`${rel}\``);

      if (matchedNotes.length >= limit) {
        break;
      }
    } catch {
      // 容錯跳過異常檔案
    }
  }

  if (matchedNotes.length === 0) {
    return `📭 找不到符合條件（標籤: ${args.tag ?? "全部"}）的筆記。`;
  }

  const header = `📚 共篩選出 ${matchedNotes.length} 則筆記（上限 ${limit}）：`;
  return `${header}\n\n${matchedNotes.join("\n\n")}`;
}
