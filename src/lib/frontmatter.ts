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
