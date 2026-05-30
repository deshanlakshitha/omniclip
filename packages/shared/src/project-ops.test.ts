import { describe, it, expect } from 'vitest';
import { createBlock, createProject } from './factory.js';
import {
  addBlock,
  addPage,
  countBlocks,
  deleteBlock,
  deletePage,
  moveBlock,
  movePage,
  updateBlock,
} from './project-ops.js';

describe('project-ops', () => {
  it('starts with one page and no blocks', () => {
    const p = createProject('Test');
    expect(p.pages).toHaveLength(1);
    expect(countBlocks(p)).toBe(0);
  });

  it('adds and deletes pages but never drops below one', () => {
    let p = createProject();
    p = addPage(p);
    expect(p.pages).toHaveLength(2);
    p = deletePage(p, p.pages[0].id);
    expect(p.pages).toHaveLength(1);
    p = deletePage(p, p.pages[0].id);
    expect(p.pages).toHaveLength(1); // recreated
  });

  it('reorders pages', () => {
    let p = createProject();
    p = addPage(p, 'second');
    const firstId = p.pages[0].id;
    p = movePage(p, 0, 1);
    expect(p.pages[1].id).toBe(firstId);
  });

  it('adds, updates and deletes blocks', () => {
    let p = createProject();
    const pageId = p.pages[0].id;
    const block = createBlock('text', { text: 'hello' });
    p = addBlock(p, pageId, block);
    expect(countBlocks(p)).toBe(1);
    p = updateBlock(p, block.id, { text: 'world' });
    expect(p.pages[0].blocks[0].text).toBe('world');
    p = deleteBlock(p, pageId, block.id);
    expect(countBlocks(p)).toBe(0);
  });

  it('moves a block across pages', () => {
    let p = createProject();
    p = addPage(p, 'two');
    const [pageA, pageB] = p.pages;
    const block = createBlock('text', { text: 'movable' });
    p = addBlock(p, pageA.id, block);
    p = moveBlock(p, pageA.id, pageB.id, block.id, 0);
    expect(p.pages[0].blocks).toHaveLength(0);
    expect(p.pages[1].blocks[0].id).toBe(block.id);
  });
});
