import * as fs from "fs";
import * as path from "path";
import { getVaultPath, ensureDir, titleToFilename, getTodayString } from "../lib/vault.js";
import { buildNoteContent } from "../lib/frontmatter.js";

export const addNoteSchema = {
  name: "add_note",
  description:
    "在 Obsidian Vault 的 inbox/ 資料夾新增一則筆記（.md 格式，含 Frontmatter）",
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
      tags: {
        type: "array",
        items: { type: "string" },
        description: "標籤清單（可選）",
      },
    },
    required: ["title", "content"],
  },
};

export async function addNote(args: {
  title: string;
  content: string;
  tags?: string[];
}): Promise<string> {
  const vaultPath = getVaultPath();
  const inboxDir = path.join(vaultPath, "inbox");
  ensureDir(inboxDir);

  const filename = `${titleToFilename(args.title)}.md`;
  const filePath = path.join(inboxDir, filename);

  const noteContent = buildNoteContent(
    {
      title: args.title,
      date: getTodayString(),
      tags: args.tags ?? ["ai-note"],
      source: "obsidian-mcp",
    },
    args.content
  );

  fs.writeFileSync(filePath, noteContent, "utf-8");

  return `✅ 筆記已儲存：inbox/${filename}`;
}
