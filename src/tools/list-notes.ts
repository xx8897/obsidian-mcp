import * as path from "path";
import { getVaultPath, getAllMdFiles } from "../lib/vault.js";
import { readNote } from "../lib/frontmatter.js";

export const listNotesSchema = {
  name: "list_notes",
  description: "列出 Obsidian Vault 中所有的筆記，回傳標題、路徑與標籤",
  inputSchema: {
    type: "object" as const,
    properties: {
      folder: {
        type: "string",
        description: "限定掃描的子資料夾（可選，例如 'inbox' 或 'daily'）",
      },
    },
    required: [],
  },
};

export async function listNotes(args: {
  folder?: string;
}): Promise<string> {
  const vaultPath = getVaultPath();
  const scanDir = args.folder
    ? path.join(vaultPath, args.folder)
    : vaultPath;

  const files = getAllMdFiles(scanDir);

  if (files.length === 0) {
    return "📭 找不到任何筆記。";
  }

  const notes = files.map((filePath) => {
    const rel = path.relative(vaultPath, filePath);
    try {
      const { frontmatter } = readNote(filePath);
      const title = (frontmatter.title as string) ?? path.basename(filePath, ".md");
      const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.join(", ") : "-";
      const date = (frontmatter.date as string) ?? "-";
      return `- **${title}** | 📅 ${date} | 🏷️ ${tags}\n  📄 \`${rel}\``;
    } catch {
      return `- \`${rel}\`（無法解析 Frontmatter）`;
    }
  });

  return `📚 共找到 ${files.length} 則筆記：\n\n${notes.join("\n\n")}`;
}
