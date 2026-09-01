import matter from "gray-matter";
import * as fs from "fs";

export interface NoteFrontmatter {
  title: string;
  date: string;
  tags?: string[];
  source: "obsidian-mcp";
}

/**
 * 將 Frontmatter + 內文組合成完整的 Markdown 字串
 */
export function buildNoteContent(
  frontmatter: NoteFrontmatter,
  body: string
): string {
  return matter.stringify(body, frontmatter);
}

/**
 * 讀取一個 .md 檔案，解析並回傳 { frontmatter, content }
 */
export function readNote(filePath: string): {
  frontmatter: Record<string, unknown>;
  content: string;
} {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  return {
    frontmatter: parsed.data,
    content: parsed.content.trim(),
  };
}
