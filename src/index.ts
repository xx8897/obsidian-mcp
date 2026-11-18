/**
 * Copyright 2026 xx8897 and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * @canary: obsidian-mcp-xx8897-server-core
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { addNoteSchema, addNote } from "./tools/add-note.js";
import { appendNoteSchema, appendNote } from "./tools/append-note.js";
import { updateFrontmatterSchema, updateFrontmatter } from "./tools/update-frontmatter.js";
import { addDailyLogSchema, addDailyLog } from "./tools/add-daily.js";
import { listNotesSchema, listNotes } from "./tools/list-notes.js";
import { searchNotesSchema, searchNotes } from "./tools/search-notes.js";
import { getNoteSchema, getNote } from "./tools/get-note.js";
import { getBacklinksSchema, getBacklinks } from "./tools/get-backlinks.js";
import { findRelatedNotesSchema, findRelatedNotes } from "./tools/find-related.js";
import { vaultOverviewSchema, vaultOverview } from "./tools/vault-overview.js";

import {
  AddNoteArgs,
  AppendToNoteArgs,
  UpdateFrontmatterArgs,
  GetNoteArgs,
  ListNotesArgs,
  SearchNotesArgs,
  GetBacklinksArgs,
  FindRelatedNotesArgs,
  VaultOverviewArgs,
} from "./types.js";

// 建立 MCP Server 實例
const server = new Server(
  {
    name: "obsidian-mcp",
    version: "2.1.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 回報所有可用的 Tools 清單
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      vaultOverviewSchema,
      addNoteSchema,
      appendNoteSchema,
      updateFrontmatterSchema,
      getNoteSchema,
      listNotesSchema,
      searchNotesSchema,
      getBacklinksSchema,
      findRelatedNotesSchema,
      addDailyLogSchema,
    ],
  };
});

// 分派 Tool 呼叫至對應的實作函式
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case "vault_overview":
        result = await vaultOverview(args as unknown as VaultOverviewArgs);
        break;
      case "add_note":
        result = await addNote(args as unknown as AddNoteArgs);
        break;
      case "append_to_note":
        result = await appendNote(args as unknown as AppendToNoteArgs);
        break;
      case "update_frontmatter":
        result = await updateFrontmatter(args as unknown as UpdateFrontmatterArgs);
        break;
      case "get_note":
        result = await getNote(args as unknown as GetNoteArgs & { note_path?: string });
        break;
      case "list_notes":
        result = await listNotes(args as unknown as ListNotesArgs);
        break;
      case "search_notes":
        result = await searchNotes(args as unknown as SearchNotesArgs);
        break;
      case "get_backlinks":
        result = await getBacklinks(args as unknown as GetBacklinksArgs);
        break;
      case "find_related_notes":
        result = await findRelatedNotes(args as unknown as FindRelatedNotesArgs);
        break;
      case "add_daily_log":
        result = await addDailyLog(args as { content: string });
        break;
      default:
        throw new Error(`未知的 Tool：${name}`);
    }

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `❌ 執行失敗：${message}` }],
      isError: true,
    };
  }
});

// 啟動 stdio transport
async function main() {
  if (!process.env.VAULT_PATH) {
    console.error("[obsidian-mcp] 錯誤：請設定環境變數 VAULT_PATH");
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[obsidian-mcp] 伺服器已啟動，等待指令...");
}

main().catch((err) => {
  console.error("[obsidian-mcp] 啟動失敗：", err);
  process.exit(1);
});
