import { describe, it, expect } from 'vitest';
import { createBlock } from './factory.js';
import { blockToMarkdown } from './markdown.js';

describe('blockToMarkdown', () => {
  it('renders headings at the right level', () => {
    expect(blockToMarkdown(createBlock('heading', { text: 'Title', level: 2 }))).toBe('## Title');
  });

  it('renders ordered and unordered lists', () => {
    const ul = createBlock('list', { text: 'a\nb', ordered: false });
    expect(blockToMarkdown(ul)).toBe('- a\n- b');
    const ol = createBlock('list', { text: 'a\nb', ordered: true });
    expect(blockToMarkdown(ol)).toBe('1. a\n2. b');
  });

  it('renders a markdown table', () => {
    const t = createBlock('table', { rows: [['h1', 'h2'], ['a', 'b']] });
    expect(blockToMarkdown(t)).toBe('| h1 | h2 |\n| --- | --- |\n| a | b |');
  });

  it('renders an image with caption', () => {
    const img = createBlock('image', { caption: 'pic', asset: { src: 'http://x/y.png', downloaded: false } });
    expect(blockToMarkdown(img)).toBe('![pic](http://x/y.png)');
  });

  it('renders fenced code with language', () => {
    const code = createBlock('code', { text: 'const a=1', language: 'ts' });
    expect(blockToMarkdown(code)).toBe('```ts\nconst a=1\n```');
  });
});
