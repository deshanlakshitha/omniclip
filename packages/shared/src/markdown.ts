import { type Block, type Project } from './types.js';

/** Render a single block to Markdown. */
export function blockToMarkdown(block: Block): string {
  switch (block.type) {
    case 'heading': {
      const level = Math.min(Math.max(block.level ?? 2, 1), 6);
      return `${'#'.repeat(level)} ${block.text ?? ''}`;
    }
    case 'text':
      return block.text ?? '';
    case 'code':
      return `\`\`\`${block.language ?? ''}\n${block.text ?? ''}\n\`\`\``;
    case 'list': {
      const lines = (block.text ?? '').split('\n').filter(Boolean);
      return lines
        .map((line, i) => (block.ordered ? `${i + 1}. ${line}` : `- ${line}`))
        .join('\n');
    }
    case 'table': {
      const rows = block.rows ?? [];
      if (rows.length === 0) return '';
      const header = `| ${rows[0].join(' | ')} |`;
      const sep = `| ${rows[0].map(() => '---').join(' | ')} |`;
      const body = rows
        .slice(1)
        .map((r) => `| ${r.join(' | ')} |`)
        .join('\n');
      return [header, sep, body].filter(Boolean).join('\n');
    }
    case 'image': {
      const alt = block.caption ?? 'image';
      const src = block.asset?.localRef ?? block.asset?.src ?? '';
      return `![${alt}](${src})`;
    }
    case 'video': {
      const src = block.asset?.localRef ?? block.asset?.src ?? '';
      return `[Video: ${block.caption ?? src}](${src})`;
    }
    case 'region':
      return block.text ?? `![region](${block.asset?.localRef ?? block.asset?.src ?? ''})`;
    default:
      return block.text ?? '';
  }
}

export function projectToMarkdown(project: Project): string {
  const parts: string[] = [`# ${project.name}`, ''];
  project.pages.forEach((page, idx) => {
    if (page.title) parts.push(`## ${page.title}`, '');
    else parts.push(`## Page ${idx + 1}`, '');
    for (const block of page.blocks) {
      parts.push(blockToMarkdown(block), '');
    }
  });
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function projectToPlainText(project: Project): string {
  const parts: string[] = [project.name, ''];
  for (const page of project.pages) {
    if (page.title) parts.push(page.title);
    for (const block of page.blocks) {
      if (block.type === 'image' || block.type === 'video') {
        parts.push(`[${block.type}: ${block.asset?.src ?? ''}]`);
      } else if (block.type === 'table') {
        for (const row of block.rows ?? []) parts.push(row.join('\t'));
      } else {
        parts.push(block.text ?? '');
      }
      parts.push('');
    }
  }
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
