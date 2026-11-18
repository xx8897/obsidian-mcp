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

import { AddNoteArgs, AppendToNoteArgs, UpdateFrontmatterArgs } from "./types.js";

// 建立 MCP Server 實例
const server = new Server(
  {
    name: "obsidian-mcp",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 回報所有可用的 Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      addNoteSchema,
      appendNoteSchema,
      updateFrontmatterSchema,
      addDailyLogSchema,
      listNotesSchema,
      searchNotesSchema,
      getNoteSchema,
    ],
  };
});

// 分派 Tool 呼叫至對應的實作函式
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case "add_note":
        result = await addNote(args as unknown as AddNoteArgs);
        break;
      case "append_to_note":
        result = await appendNote(args as unknown as AppendToNoteArgs);
        break;
      case "update_frontmatter":
        result = await updateFrontmatter(args as unknown as UpdateFrontmatterArgs);
        break;
      case "add_daily_log":
        result = await addDailyLog(args as { content: string });
        break;
      case "list_notes":
        result = await listNotes(args as { folder?: string });
        break;
      case "search_notes":
        result = await searchNotes(args as { query: string });
        break;
      case "get_note":
        result = await getNote(args as { note_path: string });
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[obsidian-mcp] 伺服器已啟動，等待指令...");
}

main().catch((err) => {
  console.error("[obsidian-mcp] 啟動失敗：", err);
  process.exit(1);
});
