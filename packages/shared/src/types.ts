/**
 * OmniClip core data model.
 *
 * Everything captured from a page is normalized into a `Block`. The document is
 * a `Project` made of `Page`s, each holding an ordered list of `Block`s. Export
 * engines consume a `Project` and never need to know how a block was captured —
 * this decoupling is the backbone of the whole product.
 */

export type BlockType =
  | 'text'
  | 'heading'
  | 'image'
  | 'video'
  | 'list'
  | 'table'
  | 'code'
  | 'region';

/** Where a block came from — used for re-capture, citations and provenance. */
export interface BlockSource {
  url: string;
  title: string;
  /** Stable CSS selector or XPath used to re-capture / refresh the block. */
  domPath: string;
  /** ISO-8601 timestamp of capture. */
  capturedAt: string;
  boundingRect?: { x: number; y: number; width: number; height: number };
}

/** A downloaded/embedded media asset referenced by a block. */
export interface MediaAsset {
  /** Original source URL of the media. */
  src: string;
  /** Object URL / data URL / local path once downloaded. */
  localRef?: string;
  /** Base64 (no data: prefix) — used by export engines that embed bytes. */
  base64?: string;
  mime?: string;
  width?: number;
  height?: number;
  /** Video duration in seconds, when known. */
  durationSec?: number;
  /** Whether the asset bytes have been fetched and stored. */
  downloaded: boolean;
}

export interface Block {
  id: string;
  type: BlockType;
  /** Clean extracted text (markdown-ish) for text/heading/list/code blocks. */
  text?: string;
  /** Sanitized rich HTML (optional, kept for high-fidelity HTML export). */
  html?: string;
  /** Heading level 1-6 for `heading` blocks. */
  level?: number;
  /** Ordered/unordered for `list` blocks. */
  ordered?: boolean;
  /** Programming language for `code` blocks. */
  language?: string;
  /** Tabular data for `table` blocks (rows of cells). */
  rows?: string[][];
  /** Media asset for `image`/`video`/`region` blocks. */
  asset?: MediaAsset;
  /** Caption / alt text. */
  caption?: string;
  source: BlockSource;
  meta?: Record<string, unknown>;
}

export interface Page {
  id: string;
  title?: string;
  blocks: Block[];
}

export interface Project {
  id: string;
  name: string;
  pages: Page[];
  createdAt: string;
  updatedAt: string;
  /** Schema version so stored projects can be migrated later. */
  schemaVersion: number;
}

export const SCHEMA_VERSION = 1;

/** Supported export formats. */
export type ExportFormat = 'txt' | 'md' | 'html' | 'docx' | 'pdf' | 'pptx';

export interface ExportOptions {
  /** Page size for paged formats. */
  pageSize?: 'A4' | 'LETTER';
  /** Include downloaded media in the output (vs. linking by URL). */
  includeMedia?: boolean;
  /** Title shown in the document metadata / first page. */
  documentTitle?: string;
}

export interface ExportResult {
  filename: string;
  mime: string;
  /** Output bytes. */
  data: Uint8Array;
}
