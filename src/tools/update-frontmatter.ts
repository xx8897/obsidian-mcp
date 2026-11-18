/**
 * Copyright 2026 xx8897 and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * @canary: obsidian-mcp-xx8897-tool-update-frontmatter
 */

import * as fs from "fs";
import matter from "gray-matter";
import { getSafeFilePath } from "../lib/vault.js";
import { UpdateFrontmatterArgs } from "../types.js";

export const updateFrontmatterSchema = {
  name: "update_frontmatter",
  description:
    "原地安全增修 Obsidian 筆記的 Frontmatter 元數據（標籤增減、狀態設定、自訂欄位），絕對不損壞正文",
  inputSchema: {
    type: "object" as const,
    properties: {
      path: {
        type: "string",
        description: "筆記相對路徑（例如：'projects/cdp/architecture-v2.md'）",
      },
      addTags: {
        type: "array",
        items: { type: "string" },
        description: "欲新增的標籤清單",
      },
      removeTags: {
        type: "array",
        items: { type: "string" },
        description: "欲移除的標籤清單",
      },
      status: {
        type: "string",
        description: "筆記狀態（例如：'draft', 'in-progress', 'completed', 'archived'）",
      },
      customFields: {
        type: "object",
        description: "其他欲原地增修的 Frontmatter 鍵值對",
      },
    },
    required: ["path"],
  },
};

export async function updateFrontmatter(args: UpdateFrontmatterArgs): Promise<string> {
  const filePath = getSafeFilePath(args.path);

  if (!fs.existsSync(filePath)) {
    throw new Error(`找不到指定的筆記檔案：${args.path}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  const data = { ...parsed.data };

  // 1. 處理標籤更新 (addTags / removeTags)
  let currentTags: string[] = [];
  if (Array.isArray(data.tags)) {
    currentTags = [...data.tags];
  } else if (typeof data.tags === "string") {
    currentTags = [data.tags];
  }

  if (args.addTags && Array.isArray(args.addTags)) {
    for (const tag of args.addTags) {
      const cleanTag = tag.trim().replace(/^#/, "");
      if (cleanTag && !currentTags.includes(cleanTag)) {
        currentTags.push(cleanTag);
      }
    }
  }

  if (args.removeTags && Array.isArray(args.removeTags)) {
    const toRemove = new Set(args.removeTags.map((t) => t.trim().replace(/^#/, "")));
    currentTags = currentTags.filter((t) => !toRemove.has(t));
  }

  data.tags = currentTags;

  // 2. 處理狀態更新 (status)
  if (args.status !== undefined) {
    data.status = args.status;
  }

  // 3. 處理自訂欄位 (customFields)
  if (args.customFields && typeof args.customFields === "object") {
    for (const [key, value] of Object.entries(args.customFields)) {
      data[key] = value;
    }
  }

  // 4. 原地重新序列化 Frontmatter 與保留原有正文
  const updatedRaw = matter.stringify(parsed.content, data);
  fs.writeFileSync(filePath, updatedRaw, "utf-8");

  return `✅ Frontmatter 元數據已成功原地更新：${args.path}`;
}
