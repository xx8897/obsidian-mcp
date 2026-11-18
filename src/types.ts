/**
 * Copyright 2026 xx8897 and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * @canary: obsidian-mcp-xx8897-types-v2
 */

/**
 * Obsidian 筆記 Frontmatter YAML 元數據介面
 */
export interface Frontmatter {
  title?: string;
  date?: string;
  tags?: string[];
  source?: string;
  status?: string;
  [key: string]: any;
}

/**
 * 完整筆記結構
 */
export interface NoteContent {
  frontmatter: Frontmatter;
  content: string;
}

/**
 * 筆記條目摘要（清單用）
 */
export interface NoteListItem {
  path: string;
  title: string;
  tags: string[];
  mtime: number;
}

/**
 * 雙向反向連結條目結構
 */
export interface BacklinkItem {
  sourcePath: string;
  sourceTitle: string;
  snippet: string;
}

/**
 * 關聯概念筆記推薦條目
 */
export interface RelatedNoteItem {
  path: string;
  title: string;
  score: number;
  commonTags: string[];
  commonLinks: string[];
}

/**
 * 全庫知識圖譜體檢概覽
 */
export interface VaultOverview {
  totalNotes: number;
  tagCounts: Record<string, number>;
  orphanNotes: string[];
  centralHubs: Array<{ path: string; linkCount: number }>;
}

/* =========================================================
 * 8 大 MCP Tools 輸入引數 (Input Arguments) 定義
 * ========================================================= */

/**
 * 1. add_note 引數定義（支援任意子資料夾與自動 mkdir）
 */
export interface AddNoteArgs {
  title: string;
  content: string;
  folder?: string;
  tags?: string[];
}

/**
 * 2. append_to_note 引數定義（安全追加，支援章節精確插入）
 */
export interface AppendToNoteArgs {
  path: string;
  content: string;
  targetHeading?: string;
}

/**
 * 3. update_frontmatter 引數定義（原地元數據增修）
 */
export interface UpdateFrontmatterArgs {
  path: string;
  addTags?: string[];
  removeTags?: string[];
  status?: string;
  customFields?: Record<string, any>;
}

/**
 * 4. get_note 引數定義
 */
export interface GetNoteArgs {
  path: string;
}

/**
 * 5. list_notes 引數定義（目錄與標籤過濾 + 筆數上限）
 */
export interface ListNotesArgs {
  folder?: string;
  tag?: string;
  limit?: number;
}

/**
 * 6. search_notes 引數定義（Token 預算受控檢索）
 */
export interface SearchNotesArgs {
  query: string;
  tags?: string[];
  folder?: string;
  limit?: number;
}

/**
 * 7. get_backlinks 引數定義（查詢引用此筆記的所有來源）
 */
export interface GetBacklinksArgs {
  title: string;
}

/**
 * 8. find_related_notes 引數定義（基於圖譜與標籤推薦相關筆記）
 */
export interface FindRelatedNotesArgs {
  path: string;
  limit?: number;
}
