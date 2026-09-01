import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { addNoteSchema, addNote } from "./tools/add-note.js";
import { addDailyLogSchema, addDailyLog } from "./tools/add-daily.js";
import { listNotesSchema, listNotes } from "./tools/list-notes.js";
import { searchNotesSchema, searchNotes } from "./tools/search-notes.js";
import { getNoteSchema, getNote } from "./tools/get-note.js";

// 建立 MCP Server 實例
const server = new Server(
  {
    name: "obsidian-mcp",
    version: "1.0.0",
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
        result = await addNote(args as { title: string; content: string; tags?: string[] });
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
