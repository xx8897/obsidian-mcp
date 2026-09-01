import * as path from "path";
import { getVaultPath, getAllMdFiles } from "../lib/vault.js";
import { readNote } from "../lib/frontmatter.js";

export const searchNotesSchema = {
  name: "search_notes",
  description: "全文搜尋 Obsidian Vault 中所有筆記，回傳包含關鍵字的筆記摘要",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "搜尋關鍵字",
      },
    },
    required: ["query"],
  },
};

export async function searchNotes(args: { query: string }): Promise<string> {
  const vaultPath = getVaultPath();
  const files = getAllMdFiles(vaultPath);
  const keyword = args.query.toLowerCase();
  const results: string[] = [];

  for (const filePath of files) {
    try {
      const { frontmatter, content } = readNote(filePath);
      const fullText = `${frontmatter.title ?? ""} ${content}`.toLowerCase();

      if (fullText.includes(keyword)) {
        const rel = path.relative(vaultPath, filePath);
        const title = (frontmatter.title as string) ?? path.basename(filePath, ".md");

        // 擷取關鍵字周圍的文字作為摘要
        const idx = content.toLowerCase().indexOf(keyword);
        const start = Math.max(0, idx - 60);
        const end = Math.min(content.length, idx + 100);
        const excerpt =
          idx >= 0
            ? `...${content.slice(start, end).replace(/\n/g, " ")}...`
            : "(關鍵字出現在標題中)";

        results.push(`- **${title}**\n  📄 \`${rel}\`\n  > ${excerpt}`);
      }
    } catch {
      // 跳過無法解析的檔案
    }
  }

  if (results.length === 0) {
    return `🔍 找不到包含「${args.query}」的筆記。`;
  }

  return `🔍 搜尋「${args.query}」，找到 ${results.length} 則結果：\n\n${results.join("\n\n")}`;
}
