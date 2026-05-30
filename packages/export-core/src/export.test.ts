import { describe, it, expect } from 'vitest';
import { addBlock, createBlock, createProject } from '@omniclip/shared';
import { exportProject } from './index.js';

// 1x1 transparent PNG
const PNG_1x1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function sampleProject() {
  let p = createProject('Sample Doc');
  const pageId = p.pages[0].id;
  p = addBlock(p, pageId, createBlock('heading', { text: 'Hello "world" — test', level: 1 }));
  p = addBlock(p, pageId, createBlock('text', { text: 'A paragraph with unicode: café résumé 你好.' }));
  p = addBlock(p, pageId, createBlock('list', { text: 'one\ntwo\nthree', ordered: true }));
  p = addBlock(p, pageId, createBlock('table', { rows: [['A', 'B'], ['1', '2']] }));
  p = addBlock(
    p,
    pageId,
    createBlock('image', {
      caption: 'tiny png',
      asset: { src: 'http://x/y.png', base64: PNG_1x1, mime: 'image/png', width: 1, height: 1, downloaded: true },
    }),
  );
  return p;
}

const decoder = new TextDecoder();

describe('exporters', () => {
  const project = sampleProject();

  it('txt produces readable text', async () => {
    const r = await exportProject(project, 'txt');
    expect(r.filename).toBe('Sample-Doc.txt');
    expect(decoder.decode(r.data)).toContain('Hello');
  });

  it('md produces markdown', async () => {
    const r = await exportProject(project, 'md');
    const txt = decoder.decode(r.data);
    expect(txt).toContain('# Sample Doc');
    expect(txt).toContain('| A | B |');
  });

  it('html produces a document', async () => {
    const r = await exportProject(project, 'html');
    expect(decoder.decode(r.data)).toContain('<!doctype html>');
  });

  it('docx produces a zip (PK header)', async () => {
    const r = await exportProject(project, 'docx');
    expect(r.data[0]).toBe(0x50); // P
    expect(r.data[1]).toBe(0x4b); // K
    expect(r.data.length).toBeGreaterThan(1000);
  });

  it('pdf produces a %PDF header', async () => {
    const r = await exportProject(project, 'pdf');
    expect(decoder.decode(r.data.slice(0, 5))).toBe('%PDF-');
  });

  it('pptx produces a zip (PK header)', async () => {
    const r = await exportProject(project, 'pptx');
    expect(r.data[0]).toBe(0x50);
    expect(r.data[1]).toBe(0x4b);
  });
});
