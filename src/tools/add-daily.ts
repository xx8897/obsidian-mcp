/**
 * Copyright 2026 xx8897 and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * @canary: obsidian-mcp-xx8897-tool-add-daily
 */

import * as fs from "fs";
import * as path from "path";
import {
  getVaultPath,
  ensureDir,
  getTodayString,
  atomicWriteFileSync,
} from "../lib/vault.js";

export const addDailyLogSchema = {
  name: "add_daily_log",
  description:
    "將一段內容追加至今天的日誌頁（Vault 的 daily/YYYY-MM-DD.md），若不存在則自動建立",
  inputSchema: {
    type: "object" as const,
    properties: {
      content: {
        type: "string",
        description: "要追加至今日日誌的 Markdown 內容",
      },
    },
    required: ["content"],
  },
};

export async function addDailyLog(args: { content: string }): Promise<string> {
  const vaultPath = getVaultPath();
  const dailyDir = path.join(vaultPath, "daily");
  ensureDir(dailyDir);

  const today = getTodayString();
  const filePath = path.join(dailyDir, `${today}.md`);

  const now = new Date().toLocaleTimeString("zh-TW", { hour12: false });

  let baseContent = "";
  if (!fs.existsSync(filePath)) {
    // 首次建立：寫入 Frontmatter 與標題
    baseContent = `---\ntitle: ${today} Daily Log\ndate: ${today}\ntags: [daily, ai-log]\nsource: obsidian-mcp\n---\n\n# ${today}\n\n`;
  } else {
    baseContent = fs.readFileSync(filePath, "utf-8");
  }

  // 追加帶時間戳記的內容
  const entry = `\n## ${now}\n\n${args.content}\n`;
  atomicWriteFileSync(filePath, baseContent + entry);

  return `✅ 已追加至每日日誌：daily/${today}.md`;
}
