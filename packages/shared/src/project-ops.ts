import { type Block, type Page, type Project } from './types.js';
import { createPage } from './factory.js';

/**
 * Pure, immutable operations on a Project. The extension store applies these via
 * Immer, but keeping them pure makes them trivially unit-testable and reusable.
 */

function touch(project: Project): Project {
  return { ...project, updatedAt: new Date().toISOString() };
}

export function addPage(project: Project, title?: string, index?: number): Project {
  const page = createPage(title ?? `Page ${project.pages.length + 1}`);
  const pages = [...project.pages];
  pages.splice(index ?? pages.length, 0, page);
  return touch({ ...project, pages });
}

export function deletePage(project: Project, pageId: string): Project {
  const pages = project.pages.filter((p) => p.id !== pageId);
  // Never allow a project with zero pages.
  if (pages.length === 0) pages.push(createPage('Page 1'));
  return touch({ ...project, pages });
}

export function movePage(project: Project, from: number, to: number): Project {
  const pages = [...project.pages];
  if (from < 0 || from >= pages.length || to < 0 || to >= pages.length) return project;
  const [moved] = pages.splice(from, 1);
  pages.splice(to, 0, moved);
  return touch({ ...project, pages });
}

export function addBlock(project: Project, pageId: string, block: Block, index?: number): Project {
  const pages = project.pages.map((p) => {
    if (p.id !== pageId) return p;
    const blocks = [...p.blocks];
    blocks.splice(index ?? blocks.length, 0, block);
    return { ...p, blocks };
  });
  return touch({ ...project, pages });
}

export function deleteBlock(project: Project, pageId: string, blockId: string): Project {
  const pages = project.pages.map((p) =>
    p.id === pageId ? { ...p, blocks: p.blocks.filter((b) => b.id !== blockId) } : p,
  );
  return touch({ ...project, pages });
}

export function updateBlock(
  project: Project,
  blockId: string,
  patch: Partial<Block>,
): Project {
  const pages = project.pages.map((p) => ({
    ...p,
    blocks: p.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
  }));
  return touch({ ...project, pages });
}

export function moveBlock(
  project: Project,
  fromPageId: string,
  toPageId: string,
  blockId: string,
  toIndex: number,
): Project {
  let moving: Block | undefined;
  const stripped: Page[] = project.pages.map((p) => {
    if (p.id !== fromPageId) return p;
    const found = p.blocks.find((b) => b.id === blockId);
    if (found) moving = found;
    return { ...p, blocks: p.blocks.filter((b) => b.id !== blockId) };
  });
  if (!moving) return project;
  const pages = stripped.map((p) => {
    if (p.id !== toPageId) return p;
    const blocks = [...p.blocks];
    blocks.splice(toIndex, 0, moving!);
    return { ...p, blocks };
  });
  return touch({ ...project, pages });
}

export function countBlocks(project: Project): number {
  return project.pages.reduce((n, p) => n + p.blocks.length, 0);
}
