/**
 * Copyright 2026 xx8897 and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * @canary: obsidian-mcp-xx8897-tool-get-note
 */

import * as fs from "fs";
import * as path from "path";
import { getSafeFilePath } from "../lib/vault.js";
import { readNote } from "../lib/frontmatter.js";
import { GetNoteArgs } from "../types.js";

export const getNoteSchema = {
  name: "get_note",
  description: "讀取 Obsidian Vault 中指定路徑的筆記全文與 Frontmatter 元數據",
  inputSchema: {
    type: "object" as const,
    properties: {
      path: {
        type: "string",
        description: "筆記的相對路徑，例如 'projects/cdp/architecture-v2.md' 或 'inbox/note.md'",
      },
      note_path: {
        type: "string",
        description: "相容舊版介面之筆記相對路徑",
      },
    },
    required: [],
  },
};

export async function getNote(args: GetNoteArgs & { note_path?: string }): Promise<string> {
  const targetRel = args.path || args.note_path;
  if (!targetRel) {
    throw new Error("請提供筆記相對路徑 path");
  }

  const fullPath = getSafeFilePath(targetRel);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`找不到指定的筆記檔案：${targetRel}`);
  }

  const { frontmatter, content } = readNote(fullPath);
  const title = (frontmatter.title as string) ?? path.basename(fullPath, ".md");
  const date = (frontmatter.date as string) ?? "-";
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.join(", ") : "-";
  const status = (frontmatter.status as string) ?? "";
  const statusDisplay = status ? `  |  📌 ${status}` : "";

  return `# ${title}\n📅 ${date}  |  🏷️ ${tags}${statusDisplay}\n\n---\n\n${content}`;
}
