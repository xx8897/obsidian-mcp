/**
 * Blast Radius Stdio JSON-RPC Handshake Test
 * 模擬 MCP Host (Antigravity) 透過 Stdio 啟動 obsidian-mcp 進行 JSON-RPC 雙向通訊
 */

import { spawn } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, "../dist/index.js");

async function runMcpStdioTest() {
  console.log("🔌 啟動子行程測試 MCP Stdio JSON-RPC 協議握手...");

  const child = spawn("node", [serverPath], {
    env: {
      ...process.env,
      VAULT_PATH: "d:/codespace/docs",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  child.stderr.on("data", (data) => {
    // Stderr 應該只有日誌，不干擾 JSON-RPC
    // console.log(`[STDERR LOG] ${data.toString().trim()}`);
  });

  let responseBuffer = "";
  const responses = [];

  child.stdout.on("data", (chunk) => {
    responseBuffer += chunk.toString();
    const lines = responseBuffer.split("\n");
    responseBuffer = lines.pop(); // 保留尚未成行的殘留字串

    for (const line of lines) {
      if (line.trim()) {
        try {
          const json = JSON.parse(line.trim());
          responses.push(json);
        } catch {
          // 非 JSON 格式
        }
      }
    }
  });

  // 發送 Request 輔助函式
  function sendJsonRpc(req) {
    child.stdin.write(JSON.stringify(req) + "\n");
  }

  // 1. 發送 initialize
  sendJsonRpc({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "antigravity-test-client", version: "1.0.0" },
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 500));

  // 2. 發送 tools/list
  sendJsonRpc({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  });

  await new Promise((resolve) => setTimeout(resolve, 800));

  // 3. 發送 tools/call (list_notes)
  sendJsonRpc({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "list_notes",
      arguments: { folder: "wiki", limit: 3 },
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  child.kill();

  console.log(`\n📬 收到 JSON-RPC 回應數量: ${responses.length}`);

  const initResp = responses.find((r) => r.id === 1);
  if (!initResp || !initResp.result) {
    throw new Error("❌ initialize 握手失敗或未收到回應");
  }
  console.log("  ✅ [1/3] initialize 握手成功：", initResp.result.serverInfo);

  const toolsResp = responses.find((r) => r.id === 2);
  if (!toolsResp || !toolsResp.result || !Array.isArray(toolsResp.result.tools)) {
    throw new Error("❌ tools/list 失敗或未回傳 tools 陣列");
  }
  const toolNames = toolsResp.result.tools.map((t) => t.name);
  console.log(`  ✅ [2/3] tools/list 成功枚舉 ${toolNames.length} 大工具:`, toolNames.join(", "));

  const callResp = responses.find((r) => r.id === 3);
  if (!callResp || !callResp.result || !callResp.result.content) {
    throw new Error("❌ tools/call list_notes 失敗");
  }
  console.log("  ✅ [3/3] tools/call 實體執行成功，回傳內容長度:", callResp.result.content[0].text.length);

  console.log("\n🎉 MCP Stdio JSON-RPC 實機通訊驗證 100% 通過！");
}

runMcpStdioTest().catch((err) => {
  console.error("❌ MCP Stdio 通訊測試失敗：", err);
  process.exit(1);
});
