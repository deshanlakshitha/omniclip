import { v4 as uuid } from 'uuid';
import {
  type Block,
  type BlockSource,
  type BlockType,
  type Page,
  type Project,
  SCHEMA_VERSION,
} from './types.js';

export function createSource(partial: Partial<BlockSource> & { url?: string }): BlockSource {
  return {
    url: partial.url ?? '',
    title: partial.title ?? '',
    domPath: partial.domPath ?? '',
    capturedAt: partial.capturedAt ?? new Date().toISOString(),
    boundingRect: partial.boundingRect,
  };
}

export function createBlock(
  type: BlockType,
  data: Partial<Block> = {},
  source?: Partial<BlockSource>,
): Block {
  return {
    id: data.id ?? uuid(),
    type,
    text: data.text,
    html: data.html,
    level: data.level,
    ordered: data.ordered,
    language: data.language,
    rows: data.rows,
    asset: data.asset,
    caption: data.caption,
    source: createSource({ ...source, ...data.source }),
    meta: data.meta,
  };
}

export function createPage(title?: string, blocks: Block[] = []): Page {
  return { id: uuid(), title, blocks };
}

export function createProject(name = 'Untitled OmniClip'): Project {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    name,
    pages: [createPage('Page 1')],
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  };
}
