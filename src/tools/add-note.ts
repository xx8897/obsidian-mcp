/**
 * Copyright 2026 xx8897 and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * @canary: obsidian-mcp-xx8897-tool-add-note
 */

import * as fs from "fs";
import * as path from "path";
import {
  getSafeFilePath,
  ensureDir,
  titleToFilename,
  getTodayString,
  sanitizeFolderName,
  atomicWriteFileSync,
} from "../lib/vault.js";
import { buildNoteContent } from "../lib/frontmatter.js";
import { AddNoteArgs } from "../types.js";

export const addNoteSchema = {
  name: "add_note",
  description:
    "在 Obsidian Vault 的指定資料夾（預設 inbox/）新增一則筆記（.md 格式，含 Frontmatter）",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: {
        type: "string",
        description: "筆記標題（同時作為檔案名稱）",
      },
      content: {
        type: "string",
        description: "筆記的 Markdown 內文",
      },
      folder: {
        type: "string",
        description: "目標子資料夾路徑（例如：'projects/cdp'，預設為 'inbox'）",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "標籤清單（可選）",
      },
    },
    required: ["title", "content"],
  },
};

export async function addNote(args: AddNoteArgs): Promise<string> {
  const targetFolder = sanitizeFolderName(args.folder || "inbox") || "inbox";
  const targetDir = getSafeFilePath(targetFolder);
  ensureDir(targetDir);

  const filename = `${titleToFilename(args.title)}.md`;
  const filePath = path.join(targetDir, filename);

  const noteContent = buildNoteContent(
    {
      title: args.title,
      date: getTodayString(),
      tags: args.tags ?? ["ai-note"],
      source: "obsidian-mcp",
    },
    args.content
  );

  atomicWriteFileSync(filePath, noteContent);

  const displayRelPath = path.join(targetFolder, filename).replace(/\\/g, "/");
  return `✅ 筆記已儲存：${displayRelPath}`;
}
