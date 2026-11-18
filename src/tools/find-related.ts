/**
 * Copyright 2026 xx8897 and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * @canary: obsidian-mcp-xx8897-tool-find-related
 */

import * as fs from "fs";
import * as path from "path";
import {
  getVaultPath,
  getAllMdFiles,
  getSafeFilePath,
  extractNormalizedTags,
} from "../lib/vault.js";
import { readNote } from "../lib/frontmatter.js";
import { FindRelatedNotesArgs, RelatedNoteItem } from "../types.js";

export const findRelatedNotesSchema = {
  name: "find_related_notes",
  description:
    "概念關聯推薦：基於共同標籤與雙向連結交集，計算 Jaccard 相似度，推薦最相關的知識圖譜筆記",
  inputSchema: {
    type: "object" as const,
    properties: {
      path: {
        type: "string",
        description: "當前目標筆記之相對路徑（例如：'projects/cdp/architecture-v2.md'）",
      },
      limit: {
        type: "number",
        description: "最大推薦筆數（預設 5）",
      },
    },
    required: ["path"],
  },
};

/**
 * 從筆記內文中提取所有 Wikilinks 目標標題集合（自動屏蔽程式碼區塊中的假連結）
 */
export function extractOutgoingLinks(content: string): Set<string> {
  const links = new Set<string>();
  const sanitizedContent = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "");
  const wikilinkRegex = /\[\[(.*?)\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = wikilinkRegex.exec(sanitizedContent)) !== null) {
    const rawTarget = match[1].split("|")[0].split("#")[0].trim();
    if (rawTarget) {
      links.add(path.basename(rawTarget, ".md").toLowerCase());
    }
  }

  return links;
}

/**
 * 計算兩個集合的 Jaccard 相似度 (0 ~ 1.0)
 */
export function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++;
    }
  }

  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

export async function findRelatedNotes(args: FindRelatedNotesArgs): Promise<string> {
  const targetFullPath = getSafeFilePath(args.path);

  if (!fs.existsSync(targetFullPath)) {
    throw new Error(`找不到指定的筆記檔案：${args.path}`);
  }

  const vaultPath = getVaultPath();
  const targetParsed = readNote(targetFullPath);
  const targetTitle = (targetParsed.frontmatter.title as string) ?? path.basename(targetFullPath, ".md");

  // 1. 建立目標筆記的特徵集合（標籤 + 外部連結）
  const targetTags = new Set(extractNormalizedTags(targetParsed.frontmatter.tags));
  const targetOutgoingLinks = extractOutgoingLinks(targetParsed.content);
  const targetBase = path.basename(targetFullPath, ".md").toLowerCase();

  const targetFeatures = new Set<string>();
  targetTags.forEach((t) => targetFeatures.add(`tag:${t}`));
  targetOutgoingLinks.forEach((l) => targetFeatures.add(`link:${l}`));

  if (targetFeatures.size === 0) {
    return `ℹ️ 筆記「${targetTitle}」目前沒有任何標籤或 [[雙向連結]]，無法計算概念關聯度。`;
  }

  const files = getAllMdFiles(vaultPath);
  const limit = typeof args.limit === "number" && args.limit > 0 ? args.limit : 5;
  const candidates: RelatedNoteItem[] = [];

  for (const filePath of files) {
    // 排除目標檔案自身
    if (path.resolve(filePath) === path.resolve(targetFullPath)) {
      continue;
    }

    try {
      const otherParsed = readNote(filePath);
      const otherTitle = (otherParsed.frontmatter.title as string) ?? path.basename(filePath, ".md");
      const otherRel = path.relative(vaultPath, filePath).replace(/\\/g, "/");
      const otherBase = path.basename(filePath, ".md").toLowerCase();

      const otherTags = new Set(extractNormalizedTags(otherParsed.frontmatter.tags));
      const otherOutgoingLinks = extractOutgoingLinks(otherParsed.content);

      const otherFeatures = new Set<string>();
      otherTags.forEach((t) => otherFeatures.add(`tag:${t}`));
      otherOutgoingLinks.forEach((l) => otherFeatures.add(`link:${l}`));

      // 檢查一階直接引用關聯 (Graph distance = 1)
      const directAtoB = targetOutgoingLinks.has(otherBase);
      const directBtoA = otherOutgoingLinks.has(targetBase);

      const pairTargetFeatures = new Set(targetFeatures);
      const pairOtherFeatures = new Set(otherFeatures);

      if (directAtoB || directBtoA) {
        const directEdgeKey = `edge:${[targetBase, otherBase].sort().join("<->")}`;
        pairTargetFeatures.add(directEdgeKey);
        pairOtherFeatures.add(directEdgeKey);
      }

      const score = calculateJaccardSimilarity(pairTargetFeatures, pairOtherFeatures);

      if (score > 0) {
        // 找出交集項目
        const commonTags: string[] = [];
        targetTags.forEach((t) => {
          if (otherTags.has(t)) commonTags.push(t);
        });

        const commonLinks: string[] = [];
        if (directAtoB) commonLinks.push(`直接引用 ➔ [[${otherTitle}]]`);
        if (directBtoA) commonLinks.push(`被此篇引用 ⬅ [[${otherTitle}]]`);
        targetOutgoingLinks.forEach((l) => {
          if (otherOutgoingLinks.has(l)) commonLinks.push(l);
        });

        candidates.push({
          path: otherRel,
          title: otherTitle,
          score,
          commonTags,
          commonLinks,
        });
      }
    } catch {
      // 容錯跳過異常檔案
    }
  }

  if (candidates.length === 0) {
    return `📭 找不到與「${targetTitle}」具備重疊概念的關聯筆記。`;
  }

  // 依分數降冪排序
  candidates.sort((a, b) => b.score - a.score);
  const topCandidates = candidates.slice(0, limit);

  const results = topCandidates.map((item, idx) => {
    const percent = (item.score * 100).toFixed(1);
    const tagInfo = item.commonTags.length > 0 ? `共同標籤: #${item.commonTags.join(" #")}` : "";
    const linkInfo = item.commonLinks.length > 0 ? `共同連結: [[${item.commonLinks.join("]], [[")}]]` : "";
    const meta = [tagInfo, linkInfo].filter(Boolean).join(" | ");

    return `${idx + 1}. **${item.title}** (關聯度: ${percent}%)\n   📄 \`${item.path}\`\n   💡 ${meta || "概念特徵關聯"}`;
  });

  return `🕸️ 與「${targetTitle}」最相關的前 ${topCandidates.length} 篇概念筆記：\n\n${results.join("\n\n")}`;
}
