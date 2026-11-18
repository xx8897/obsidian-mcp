/**
 * Copyright 2026 xx8897 and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * @canary: obsidian-mcp-xx8897-tool-vault-overview
 */

import * as path from "path";
import {
  getVaultPath,
  getAllMdFiles,
  getSafeFilePath,
  sanitizeFolderName,
  extractNormalizedTags,
  extractOutgoingLinks,
} from "../lib/vault.js";
import { readNote } from "../lib/frontmatter.js";
import { VaultOverviewArgs, VaultOverviewResult } from "../types.js";

export const vaultOverviewSchema = {
  name: "vault_overview",
  description:
    "全庫知識圖譜體檢概覽：統計總筆記數、雙向連結數、導航孤島、知識沉澱、未建幽靈連結與核心知識樞紐，嚴格受控於 Token 預算防護",
  inputSchema: {
    type: "object" as const,
    properties: {
      limit: {
        type: "number",
        description: "各分類清單顯示上限（預設 20，防止 Token 消耗過大）",
      },
      folder: {
        type: "string",
        description: "限定掃描之子資料夾（可選，預設掃描全庫）",
      },
    },
    required: [],
  },
};

/**
 * 執行全庫知識圖譜體檢分析
 */
export async function computeVaultOverview(args: VaultOverviewArgs): Promise<VaultOverviewResult> {
  const vaultPath = getVaultPath();
  const scanDir = args.folder ? getSafeFilePath(sanitizeFolderName(args.folder)) : vaultPath;
  const files = getAllMdFiles(scanDir);
  const limit = typeof args.limit === "number" && args.limit > 0 ? args.limit : 20;

  // 1. 建立以 relPath 為主鍵的實體檔案索引，杜絕同名覆蓋問題
  const allRelPaths: string[] = [];
  const basenameMultiMap = new Map<string, string[]>(); // baseKey -> relPath[]

  for (const f of files) {
    const rel = path.relative(vaultPath, f).replace(/\\/g, "/");
    allRelPaths.push(rel);

    const baseKey = path.basename(f, ".md").toLowerCase();
    const existing = basenameMultiMap.get(baseKey) || [];
    existing.push(rel);
    basenameMultiMap.set(baseKey, existing);
  }

  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  const danglingLinksSet = new Set<string>();
  const tagCounts: Record<string, number> = {};
  let totalLinks = 0;

  // 初始化所有實體檔案的度數為 0
  for (const rel of allRelPaths) {
    inDegree.set(rel, 0);
    outDegree.set(rel, 0);
  }

  // 2. 單趟掃描每個檔案
  for (const f of files) {
    const sourceRel = path.relative(vaultPath, f).replace(/\\/g, "/");
    const sourceBase = path.basename(f, ".md").toLowerCase();

    try {
      const { frontmatter, content } = readNote(f);

      // A. 標籤統計：統一正規化標籤解析
      const noteUniqueTags = extractNormalizedTags(frontmatter.tags);
      for (const t of noteUniqueTags) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }

      // B. 出站連結提取（已自動屏蔽程式碼區塊）
      const outgoing = extractOutgoingLinks(content); // 已是 Set<string>
      for (const targetBase of outgoing) {
        // 規則 1: 忽略自引用閉環
        if (targetBase === sourceBase) continue;

        totalLinks++;
        outDegree.set(sourceRel, (outDegree.get(sourceRel) || 0) + 1);

        // 規則 2: 檢查是否指向實體筆記
        const targetRelPaths = basenameMultiMap.get(targetBase);
        if (targetRelPaths && targetRelPaths.length > 0) {
          for (const targetRel of targetRelPaths) {
            inDegree.set(targetRel, (inDegree.get(targetRel) || 0) + 1);
          }
        } else {
          // 幽靈未建連結
          danglingLinksSet.add(targetBase);
        }
      }
    } catch {
      // 容錯略過異常檔案
    }
  }

  // 3. 節點分類
  const orphanNotes: string[] = [];
  const sinkNotes: string[] = [];
  const centralHubs: Array<{ path: string; title: string; linkCount: number }> = [];

  for (const rel of allRelPaths) {
    const inD = inDegree.get(rel) || 0;
    const outD = outDegree.get(rel) || 0;
    const title = path.basename(rel, ".md");

    // 導航孤島：全庫無任何路徑能連入（inDegree === 0）
    if (inD === 0) {
      orphanNotes.push(rel);
    }

    // 知識沉澱：有人連入，但未再向外連結（inDegree > 0 && outDegree === 0）
    if (inD > 0 && outD === 0) {
      sinkNotes.push(rel);
    }

    // 核心樞紐：出入度總和
    if (inD + outD > 0) {
      centralHubs.push({
        path: rel,
        title,
        linkCount: inD + outD,
      });
    }
  }

  // 樞紐依連結度降冪排序
  centralHubs.sort((a, b) => b.linkCount - a.linkCount);

  // 4. Token 預算防護截斷
  const totalNotes = allRelPaths.length;
  const orphanRate = totalNotes > 0 ? `${((orphanNotes.length / totalNotes) * 100).toFixed(1)}%` : "0%";

  return {
    totalNotes,
    totalLinks,
    orphanCount: orphanNotes.length,
    orphanRate,
    orphanNotes: orphanNotes.slice(0, limit),
    sinkCount: sinkNotes.length,
    sinkNotes: sinkNotes.slice(0, limit),
    danglingCount: danglingLinksSet.size,
    danglingLinks: Array.from(danglingLinksSet).slice(0, limit),
    centralHubs: centralHubs.slice(0, limit),
    tagCounts,
  };
}

export async function vaultOverview(args: VaultOverviewArgs): Promise<string> {
  const result = await computeVaultOverview(args);
  const limit = typeof args.limit === "number" && args.limit > 0 ? args.limit : 20;

  // 格式化輸出，嚴格約束 Token 預算
  const lines: string[] = [];

  lines.push(`📊 **Obsidian Vault 知識圖譜體檢總覽**`);
  lines.push(`- 📄 總筆記數：${result.totalNotes} 篇 | 🔗 總雙向連結數：${result.totalLinks} 條`);
  lines.push(`- 🏝️ 導航孤島（無入度）：${result.orphanCount} 篇 (${result.orphanRate})`);
  lines.push(`- 💧 知識沉澱（終端無出度）：${result.sinkCount} 篇`);
  lines.push(`- 👻 未建幽靈連結：${result.danglingCount} 處`);

  // Top 5 核心樞紐
  if (result.centralHubs.length > 0) {
    lines.push(`\n👑 **核心知識樞紐 (Top Hubs)**：`);
    result.centralHubs.slice(0, Math.min(5, limit)).forEach((hub, idx) => {
      lines.push(`${idx + 1}. **${hub.title}** (雙向連結度: ${hub.linkCount})\n   📄 \`${hub.path}\``);
    });
  }

  // 孤島筆記摘要
  if (result.orphanNotes.length > 0) {
    const omitted = result.orphanCount - result.orphanNotes.length;
    const omittedText = omitted > 0 ? `\n  *(...其餘 ${omitted} 篇已省略，請使用 list_notes 進行細部盤點)*` : "";
    lines.push(`\n🏝️ **待消化孤島筆記 (顯示前 ${result.orphanNotes.length} 篇)**：`);
    result.orphanNotes.forEach((rel) => lines.push(`- \`${rel}\``));
    if (omittedText) lines.push(omittedText);
  }

  // 幽靈連結摘要
  if (result.danglingLinks.length > 0) {
    const omitted = result.danglingCount - result.danglingLinks.length;
    const omittedText = omitted > 0 ? `\n  *(...其餘 ${omitted} 處已省略)*` : "";
    lines.push(`\n👻 **常被引用但尚未建立的幽靈頁面**：`);
    result.danglingLinks.forEach((link) => lines.push(`- \`[[${link}]]\``));
    if (omittedText) lines.push(omittedText);
  }

  return lines.join("\n");
}
