import { type Block, type ExportOptions, type Project } from '@omniclip/shared';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function imgSrc(block: Block, includeMedia: boolean): string {
  const asset = block.asset;
  if (!asset) return '';
  if (includeMedia && asset.base64) return `data:${asset.mime ?? 'image/png'};base64,${asset.base64}`;
  return asset.localRef ?? asset.src ?? '';
}

function blockToHtml(block: Block, includeMedia: boolean): string {
  switch (block.type) {
    case 'heading': {
      const lvl = Math.min(Math.max(block.level ?? 2, 1), 6);
      return `<h${lvl}>${esc(block.text ?? '')}</h${lvl}>`;
    }
    case 'text':
      return `<p>${esc(block.text ?? '').replace(/\n/g, '<br/>')}</p>`;
    case 'code':
      return `<pre><code>${esc(block.text ?? '')}</code></pre>`;
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const items = (block.text ?? '')
        .split('\n')
        .filter(Boolean)
        .map((li) => `<li>${esc(li)}</li>`)
        .join('');
      return `<${tag}>${items}</${tag}>`;
    }
    case 'table': {
      const rows = (block.rows ?? [])
        .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
        .join('');
      return `<table border="1" cellspacing="0" cellpadding="4">${rows}</table>`;
    }
    case 'image':
    case 'region': {
      const src = imgSrc(block, includeMedia);
      const cap = block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : '';
      return `<figure><img src="${esc(src)}" alt="${esc(block.caption ?? '')}"/>${cap}</figure>`;
    }
    case 'video': {
      const src = block.asset?.localRef ?? block.asset?.src ?? '';
      return `<figure><video controls src="${esc(src)}"></video><figcaption>${esc(block.caption ?? src)}</figcaption></figure>`;
    }
    default:
      return `<p>${esc(block.text ?? '')}</p>`;
  }
}

export function projectToHtml(project: Project, opts?: ExportOptions): string {
  const includeMedia = opts?.includeMedia ?? true;
  const body = project.pages
    .map((page, idx) => {
      const title = page.title ?? `Page ${idx + 1}`;
      const blocks = page.blocks.map((b) => blockToHtml(b, includeMedia)).join('\n');
      return `<section class="page"><h2 class="page-title">${esc(title)}</h2>\n${blocks}</section>`;
    })
    .join('\n<hr class="page-break"/>\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(opts?.documentTitle ?? project.name)}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 820px; margin: 2rem auto; padding: 0 1rem; line-height: 1.55; color: #1a1a1a; }
  img, video { max-width: 100%; height: auto; }
  figure { margin: 1rem 0; }
  figcaption { font-size: 0.85rem; color: #666; }
  pre { background: #f5f5f5; padding: 0.75rem; overflow:auto; border-radius: 6px; }
  table { border-collapse: collapse; }
  .page-break { border: none; border-top: 1px dashed #ccc; margin: 2rem 0; }
  .page-title { color: #333; }
</style>
</head>
<body>
<h1>${esc(opts?.documentTitle ?? project.name)}</h1>
${body}
</body>
</html>
`;
}
