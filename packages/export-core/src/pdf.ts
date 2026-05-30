import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { type Block, type ExportOptions, type ExportResult, type Project } from '@omniclip/shared';
import { type Exporter, base64ToBytes, safeFilename } from './exporter.js';

const PAGE_SIZES = {
  A4: [595.28, 841.89] as [number, number],
  LETTER: [612, 792] as [number, number],
};
const MARGIN = 56;

/** pdf-lib standard fonts only support WinAnsi; map common chars and strip the rest. */
function winAnsi(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2022\u00B7]/g, '-')
    // drop anything outside the printable Latin-1 range
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

interface Cursor {
  page: PDFPage;
  y: number;
}

/** Minimal text-flow layout engine over pdf-lib. */
class PdfWriter {
  private doc!: PDFDocument;
  private font!: PDFFont;
  private bold!: PDFFont;
  private mono!: PDFFont;
  private size: [number, number];
  private cursor!: Cursor;

  constructor(opts?: ExportOptions) {
    this.size = PAGE_SIZES[opts?.pageSize ?? 'A4'];
  }

  async init(): Promise<void> {
    this.doc = await PDFDocument.create();
    this.font = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.mono = await this.doc.embedFont(StandardFonts.Courier);
    this.newPage();
  }

  private get width() {
    return this.size[0] - MARGIN * 2;
  }

  private newPage(): void {
    const page = this.doc.addPage(this.size);
    this.cursor = { page, y: this.size[1] - MARGIN };
  }

  private ensure(space: number): void {
    if (this.cursor.y - space < MARGIN) this.newPage();
  }

  private wrap(text: string, font: PDFFont, fontSize: number): string[] {
    const lines: string[] = [];
    for (const raw of winAnsi(text).split('\n')) {
      const words = raw.split(/\s+/);
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(test, fontSize) > this.width && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  text(text: string, fontSize = 11, font: PDFFont = this.font, gap = 4): void {
    const lineHeight = fontSize * 1.35;
    for (const line of this.wrap(text, font, fontSize)) {
      this.ensure(lineHeight);
      this.cursor.page.drawText(line, {
        x: MARGIN,
        y: this.cursor.y - fontSize,
        size: fontSize,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      this.cursor.y -= lineHeight;
    }
    this.cursor.y -= gap;
  }

  async image(base64: string, mime: string | undefined, w?: number, h?: number): Promise<void> {
    try {
      const bytes = base64ToBytes(base64);
      const img =
        mime && (mime.includes('jpeg') || mime.includes('jpg'))
          ? await this.doc.embedJpg(bytes)
          : await this.doc.embedPng(bytes);
      const maxW = this.width;
      const ow = w ?? img.width;
      const oh = h ?? img.height;
      const ratio = Math.min(1, maxW / ow);
      const dw = ow * ratio;
      const dh = oh * ratio;
      this.ensure(dh + 6);
      this.cursor.page.drawImage(img, { x: MARGIN, y: this.cursor.y - dh, width: dw, height: dh });
      this.cursor.y -= dh + 8;
    } catch {
      this.text('[image could not be embedded]', 10, this.font);
    }
  }

  hr(): void {
    this.ensure(12);
    this.cursor.page.drawLine({
      start: { x: MARGIN, y: this.cursor.y },
      end: { x: this.size[0] - MARGIN, y: this.cursor.y },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    this.cursor.y -= 12;
  }

  pageBreak(): void {
    this.newPage();
  }

  async save(title: string): Promise<Uint8Array> {
    this.doc.setTitle(title);
    return this.doc.save();
  }

  get boldFont() {
    return this.bold;
  }
  get monoFont() {
    return this.mono;
  }
}

async function writeBlock(w: PdfWriter, block: Block, includeMedia: boolean): Promise<void> {
  switch (block.type) {
    case 'heading':
      w.text(block.text ?? '', 18 - Math.min(block.level ?? 2, 4) * 2, w.boldFont, 6);
      break;
    case 'text':
      w.text(block.text ?? '', 11);
      break;
    case 'code':
      w.text(block.text ?? '', 9.5, w.monoFont);
      break;
    case 'list': {
      const lines = (block.text ?? '').split('\n').filter(Boolean);
      lines.forEach((li, i) => w.text(`${block.ordered ? `${i + 1}.` : '-'} ${li}`, 11));
      break;
    }
    case 'table':
      for (const row of block.rows ?? []) w.text(row.join('   |   '), 10);
      break;
    case 'image':
    case 'region':
      if (includeMedia && block.asset?.base64) {
        await w.image(block.asset.base64, block.asset.mime, block.asset.width, block.asset.height);
        if (block.caption) w.text(block.caption, 9, w.boldFont);
      } else {
        w.text(`[image: ${block.asset?.src ?? ''}]`, 10);
      }
      break;
    case 'video':
      w.text(`Video: ${block.caption ?? ''} ${block.asset?.src ?? ''}`, 11, w.boldFont);
      break;
    default:
      w.text(block.text ?? '', 11);
  }
}

export const pdfExporter: Exporter = {
  format: 'pdf',
  mime: 'application/pdf',
  ext: 'pdf',
  async export(project: Project, opts?: ExportOptions): Promise<ExportResult> {
    const includeMedia = opts?.includeMedia ?? true;
    const w = new PdfWriter(opts);
    await w.init();
    w.text(opts?.documentTitle ?? project.name, 22, w.boldFont, 10);
    for (let i = 0; i < project.pages.length; i++) {
      const page = project.pages[i];
      if (i > 0) w.pageBreak();
      w.text(page.title ?? `Page ${i + 1}`, 15, w.boldFont, 6);
      w.hr();
      for (const block of page.blocks) await writeBlock(w, block, includeMedia);
    }
    const data = await w.save(opts?.documentTitle ?? project.name);
    return { filename: `${safeFilename(project.name)}.pdf`, mime: this.mime, data };
  },
};
