import {
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { type Block, type ExportOptions, type ExportResult, type Project } from '@omniclip/shared';
import { type Exporter, base64ToBytes, safeFilename } from './exporter.js';

const HEADING_MAP: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

function imageType(mime?: string): 'png' | 'jpg' | 'gif' | 'bmp' {
  if (!mime) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('bmp')) return 'bmp';
  return 'png';
}

function scaled(w?: number, h?: number, max = 500): { width: number; height: number } {
  const ow = w ?? 480;
  const oh = h ?? 320;
  const ratio = Math.min(1, max / ow);
  return { width: Math.round(ow * ratio), height: Math.round(oh * ratio) };
}

function blockToParagraphs(block: Block, includeMedia: boolean): (Paragraph | Table)[] {
  switch (block.type) {
    case 'heading':
      return [
        new Paragraph({
          text: block.text ?? '',
          heading: HEADING_MAP[Math.min(Math.max(block.level ?? 2, 1), 6)],
        }),
      ];
    case 'text':
      return (block.text ?? '')
        .split('\n')
        .map((line) => new Paragraph({ children: [new TextRun(line)] }));
    case 'code':
      return [
        new Paragraph({
          children: [new TextRun({ text: block.text ?? '', font: 'Courier New', size: 18 })],
          shading: { fill: 'F5F5F5' },
        }),
      ];
    case 'list':
      return (block.text ?? '')
        .split('\n')
        .filter(Boolean)
        .map(
          (line, i) =>
            new Paragraph({
              text: line,
              bullet: block.ordered ? undefined : { level: 0 },
              numbering: block.ordered ? { reference: 'omni-ol', level: 0, instance: i } : undefined,
            }),
        );
    case 'table': {
      const rows = (block.rows ?? []).map(
        (r) =>
          new TableRow({
            children: r.map(
              (c) => new TableCell({ children: [new Paragraph(c)] }),
            ),
          }),
      );
      if (rows.length === 0) return [];
      return [new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } })];
    }
    case 'image':
    case 'region': {
      const asset = block.asset;
      if (!includeMedia || !asset?.base64) {
        return [
          new Paragraph({
            children: [new TextRun({ text: `[image: ${asset?.src ?? ''}]`, italics: true })],
          }),
        ];
      }
      const { width, height } = scaled(asset.width, asset.height);
      const out: Paragraph[] = [
        new Paragraph({
          children: [
            new ImageRun({
              data: base64ToBytes(asset.base64),
              type: imageType(asset.mime),
              transformation: { width, height },
            }),
          ],
        }),
      ];
      if (block.caption)
        out.push(new Paragraph({ children: [new TextRun({ text: block.caption, italics: true, size: 18 })] }));
      return out;
    }
    case 'video':
      return [
        new Paragraph({
          children: [
            new TextRun({ text: `Video: ${block.caption ?? ''} `, bold: true }),
            new TextRun({ text: block.asset?.src ?? '', style: 'Hyperlink' }),
          ],
        }),
      ];
    default:
      return [new Paragraph(block.text ?? '')];
  }
}

export const docxExporter: Exporter = {
  format: 'docx',
  mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ext: 'docx',
  async export(project: Project, opts?: ExportOptions): Promise<ExportResult> {
    const includeMedia = opts?.includeMedia ?? true;
    const sections = project.pages.map((page, idx) => {
      const children: (Paragraph | Table)[] = [
        new Paragraph({ text: page.title ?? `Page ${idx + 1}`, heading: HeadingLevel.HEADING_1 }),
      ];
      for (const block of page.blocks) children.push(...blockToParagraphs(block, includeMedia));
      return { children };
    });

    const doc = new Document({
      title: opts?.documentTitle ?? project.name,
      numbering: {
        config: [
          {
            reference: 'omni-ol',
            levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: 'start' }],
          },
        ],
      },
      sections: sections.length ? sections : [{ children: [new Paragraph('')] }],
    });

    const data = await packDocx(doc);
    return { filename: `${safeFilename(project.name)}.docx`, mime: this.mime, data };
  },
};

async function packDocx(doc: Document): Promise<Uint8Array> {
  if (typeof window !== 'undefined' && typeof Blob !== 'undefined') {
    const blob = await Packer.toBlob(doc);
    return new Uint8Array(await blob.arrayBuffer());
  }
  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf);
}
