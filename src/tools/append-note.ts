/**
 * Copyright 2026 xx8897 and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * @canary: obsidian-mcp-xx8897-tool-append-note
 */

import * as fs from "fs";
import { getSafeFilePath, atomicWriteFileSync } from "../lib/vault.js";
import { AppendToNoteArgs } from "../types.js";

export const appendNoteSchema = {
  name: "append_to_note",
  description:
    "向現有 Obsidian 筆記安全追加內容，支援追加至文末或精確插入特定章節標題下方",
  inputSchema: {
    type: "object" as const,
    properties: {
      path: {
        type: "string",
        description: "筆記相對路徑（例如：'projects/cdp/architecture-v2.md'）",
      },
      content: {
        type: "string",
        description: "欲追加或插入的 Markdown 內容",
      },
      targetHeading: {
        type: "string",
        description: "可選之目標章節標題（例如：'## 待辦事項' 或 '待辦事項'），將插入於該標題區塊末尾",
      },
    },
    required: ["path", "content"],
  },
};

export async function appendNote(args: AppendToNoteArgs): Promise<string> {
  const filePath = getSafeFilePath(args.path);

  if (!fs.existsSync(filePath)) {
    throw new Error(`找不到指定的筆記檔案：${args.path}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  let updatedContent: string;

  if (args.targetHeading) {
    const lines = raw.split(/\r?\n/);
    const queryHeading = args.targetHeading.trim();
    const queryTitle = queryHeading.replace(/^#+\s*/, "").trim();

    let headingIndex = -1;
    let inCodeBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("```") || line.startsWith("~~~")) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (!inCodeBlock && line.startsWith("#")) {
        const lineTitle = line.replace(/^#+\s*/, "").trim();
        if (line === queryHeading || lineTitle === queryTitle) {
          headingIndex = i;
          break;
        }
      }
    }

    if (headingIndex === -1) {
      throw new Error(`在筆記中找不到指定的章節標題：${args.targetHeading}`);
    }

    const headingMatch = lines[headingIndex].match(/^(#+)\s+/);
    const headingLevel = headingMatch ? headingMatch[1].length : 2;

    let insertIndex = lines.length;
    let inSubsequentCodeBlock = false;
    for (let i = headingIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("```") || line.startsWith("~~~")) {
        inSubsequentCodeBlock = !inSubsequentCodeBlock;
        continue;
      }
      if (!inSubsequentCodeBlock) {
        const m = line.match(/^(#+)\s+/);
        if (m && m[1].length <= headingLevel) {
          insertIndex = i;
          break;
        }
      }
    }

    // 回退尾部的空行
    while (insertIndex > headingIndex + 1 && lines[insertIndex - 1].trim() === "") {
      insertIndex--;
    }

    const contentLines = args.content.trim().split(/\r?\n/);
    lines.splice(insertIndex, 0, ...contentLines);

    // 檢查插入點之後如果緊接著下一個標題，確保中間有一行空行隔開
    const afterInsertIndex = insertIndex + contentLines.length;
    if (afterInsertIndex < lines.length && lines[afterInsertIndex].trim().startsWith("#")) {
      lines.splice(afterInsertIndex, 0, "");
    }

    updatedContent = lines.join("\n");
  } else {
    // 未指定章節，直接追加至筆記末尾
    const cleanContent = args.content.replace(/^\r?\n+/, "");
    const baseRaw = raw.replace(/\r?\n*$/, "");
    updatedContent = `${baseRaw}\n\n${cleanContent}\n`;
  }

  atomicWriteFileSync(filePath, updatedContent);
  return `✅ 筆記追加成功：${args.path}`;
}
