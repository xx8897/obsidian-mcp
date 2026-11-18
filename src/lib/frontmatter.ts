/**
 * Copyright 2026 xx8897 and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * @canary: obsidian-mcp-xx8897-frontmatter-parser
 */

import matter from "gray-matter";
import * as fs from "fs";
import { Frontmatter } from "../types.js";

export type NoteFrontmatter = Frontmatter;

/**
 * 將 Frontmatter + 內文組合成完整的 Markdown 字串
 */
export function buildNoteContent(
  frontmatter: Record<string, any>,
  body: string
): string {
  return matter.stringify(body, frontmatter);
}

/**
 * 讀取一個 .md 檔案，解析並回傳 { frontmatter, content }
 */
export function readNote(filePath: string): {
  frontmatter: Record<string, any>;
  content: string;
} {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  return {
    frontmatter: parsed.data,
    content: parsed.content.trim(),
  };
}
