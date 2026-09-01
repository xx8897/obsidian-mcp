import * as fs from "fs";
import * as path from "path";
import { getVaultPath } from "../lib/vault.js";
import { readNote } from "../lib/frontmatter.js";

export const getNoteSchema = {
  name: "get_note",
  description: "讀取 Obsidian Vault 中指定路徑的筆記全文（相對於 Vault 根目錄）",
  inputSchema: {
    type: "object" as const,
    properties: {
      note_path: {
        type: "string",
        description: "筆記的相對路徑，例如 'inbox/買牛奶.md' 或 'daily/2026-09-01.md'",
      },
    },
    required: ["note_path"],
  },
};

export async function getNote(args: { note_path: string }): Promise<string> {
  const vaultPath = getVaultPath();
  const fullPath = path.join(vaultPath, args.note_path);

  if (!fs.existsSync(fullPath)) {
    return `❌ 找不到筆記：${args.note_path}`;
  }

  const { frontmatter, content } = readNote(fullPath);
  const title = (frontmatter.title as string) ?? path.basename(fullPath, ".md");
  const date = (frontmatter.date as string) ?? "-";
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.join(", ") : "-";

  return `# ${title}\n📅 ${date}  |  🏷️ ${tags}\n\n---\n\n${content}`;
}
