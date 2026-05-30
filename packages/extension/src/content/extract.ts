import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { type Block, type BlockType, createBlock } from '@omniclip/shared';
import { cssPath } from './dompath.js';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

function source(el: Element) {
  const rect = el.getBoundingClientRect();
  return {
    url: location.href,
    title: document.title,
    domPath: cssPath(el),
    capturedAt: new Date().toISOString(),
    boundingRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
  };
}

function absolute(url: string | null | undefined): string {
  if (!url) return '';
  try {
    return new URL(url, document.baseURI).href;
  } catch {
    return url;
  }
}

/** Pick the highest-resolution candidate from an <img>. */
function bestImageSrc(img: HTMLImageElement): string {
  if (img.currentSrc) return absolute(img.currentSrc);
  if (img.srcset) {
    const candidates = img.srcset
      .split(',')
      .map((part) => {
        const [u, d] = part.trim().split(/\s+/);
        const density = d?.endsWith('w') ? parseInt(d) : parseFloat(d ?? '1') * 1000;
        return { u, density: isNaN(density) ? 1 : density };
      })
      .sort((a, b) => b.density - a.density);
    if (candidates[0]) return absolute(candidates[0].u);
  }
  return absolute(img.src);
}

function classifyType(el: Element): BlockType {
  const tag = el.tagName.toLowerCase();
  if (tag === 'img' || tag === 'picture' || tag === 'svg') return 'image';
  if (tag === 'video' || tag === 'iframe') return 'video';
  if (tag === 'table') return 'table';
  if (tag === 'pre' || tag === 'code') return 'code';
  if (tag === 'ul' || tag === 'ol') return 'list';
  if (/^h[1-6]$/.test(tag)) return 'heading';
  // container with a dominant media child?
  if (el.querySelector('img') && (el.textContent ?? '').trim().length < 20) return 'image';
  return 'text';
}

function extractImage(el: Element): Block {
  let imgEl: HTMLImageElement | null = null;
  if (el.tagName.toLowerCase() === 'img') imgEl = el as HTMLImageElement;
  else imgEl = el.querySelector('img');

  let src = '';
  let width: number | undefined;
  let height: number | undefined;
  let caption = '';

  if (imgEl) {
    src = bestImageSrc(imgEl);
    width = imgEl.naturalWidth || imgEl.width || undefined;
    height = imgEl.naturalHeight || imgEl.height || undefined;
    caption = imgEl.alt || '';
  } else {
    // CSS background-image fallback
    const bg = getComputedStyle(el).backgroundImage;
    const match = bg.match(/url\(["']?(.*?)["']?\)/);
    if (match) src = absolute(match[1]);
  }

  return createBlock(
    'image',
    {
      caption,
      asset: { src, width, height, downloaded: false },
    },
    source(el),
  );
}

function extractVideo(el: Element): Block {
  let src = '';
  let durationSec: number | undefined;
  const tag = el.tagName.toLowerCase();
  if (tag === 'video') {
    const v = el as HTMLVideoElement;
    src = absolute(v.currentSrc || v.src || v.querySelector('source')?.src);
    durationSec = isFinite(v.duration) ? v.duration : undefined;
  } else if (tag === 'iframe') {
    src = absolute((el as HTMLIFrameElement).src);
  } else {
    src = absolute(el.querySelector('video,source,iframe')?.getAttribute('src'));
  }
  return createBlock(
    'video',
    {
      caption: el.getAttribute('title') ?? '',
      asset: { src, durationSec, downloaded: false },
      meta: { note: 'Direct download may require the OmniClip desktop companion (HLS/DASH/embeds).' },
    },
    source(el),
  );
}

function extractTable(el: Element): Block {
  const rows: string[][] = [];
  el.querySelectorAll('tr').forEach((tr) => {
    const cells: string[] = [];
    tr.querySelectorAll('th,td').forEach((c) => cells.push((c.textContent ?? '').trim()));
    if (cells.length) rows.push(cells);
  });
  return createBlock('table', { rows }, source(el));
}

function extractList(el: Element): Block {
  const items: string[] = [];
  el.querySelectorAll(':scope > li').forEach((li) => items.push((li.textContent ?? '').trim()));
  return createBlock(
    'list',
    { text: items.join('\n'), ordered: el.tagName.toLowerCase() === 'ol' },
    source(el),
  );
}

function extractText(el: Element): Block {
  const tag = el.tagName.toLowerCase();
  if (/^h[1-6]$/.test(tag)) {
    return createBlock(
      'heading',
      { text: (el.textContent ?? '').trim(), level: parseInt(tag[1]) },
      source(el),
    );
  }
  if (tag === 'pre' || tag === 'code') {
    return createBlock('code', { text: (el as HTMLElement).innerText }, source(el));
  }

  // Sanitize a clone, then try Readability for boilerplate removal, else Turndown.
  const clone = el.cloneNode(true) as HTMLElement;
  const cleanHtml = DOMPurify.sanitize(clone.outerHTML, { USE_PROFILES: { html: true } });

  let markdown = '';
  const text = (el as HTMLElement).innerText?.trim() ?? '';
  // Only run Readability for large containers (articles), otherwise just convert.
  if (text.length > 600) {
    try {
      const doc = document.implementation.createHTMLDocument('x');
      doc.body.innerHTML = cleanHtml;
      const article = new Readability(doc).parse();
      if (article?.content) {
        markdown = turndown.turndown(article.content);
      }
    } catch {
      /* fall through */
    }
  }
  if (!markdown) markdown = turndown.turndown(cleanHtml).trim();
  if (!markdown) markdown = text;

  return createBlock('text', { text: markdown, html: cleanHtml }, source(el));
}

/** Convert any selected element into a normalized Block. */
export function extractBlock(el: Element): Block {
  const type = classifyType(el);
  switch (type) {
    case 'image':
      return extractImage(el);
    case 'video':
      return extractVideo(el);
    case 'table':
      return extractTable(el);
    case 'list':
      return extractList(el);
    default:
      return extractText(el);
  }
}
