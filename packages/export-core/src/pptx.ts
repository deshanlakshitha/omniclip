import pptxgen from 'pptxgenjs';
import { type Block, type ExportOptions, type ExportResult, type Project } from '@omniclip/shared';
import { type Exporter, safeFilename } from './exporter.js';

function textBlocksToBullets(blocks: Block[]): pptxgen.TextProps[] {
  const runs: pptxgen.TextProps[] = [];
  for (const block of blocks) {
    if (block.type === 'heading') {
      runs.push({ text: block.text ?? '', options: { bold: true, fontSize: 18, breakLine: true } });
    } else if (block.type === 'text') {
      runs.push({ text: block.text ?? '', options: { fontSize: 14, breakLine: true } });
    } else if (block.type === 'list') {
      for (const li of (block.text ?? '').split('\n').filter(Boolean)) {
        runs.push({ text: li, options: { fontSize: 14, bullet: true, breakLine: true } });
      }
    } else if (block.type === 'code') {
      runs.push({ text: block.text ?? '', options: { fontSize: 11, fontFace: 'Courier New', breakLine: true } });
    } else if (block.type === 'table') {
      for (const row of block.rows ?? []) {
        runs.push({ text: row.join('   |   '), options: { fontSize: 12, breakLine: true } });
      }
    } else if (block.type === 'video') {
      runs.push({ text: `Video: ${block.asset?.src ?? ''}`, options: { fontSize: 12, italic: true, breakLine: true } });
    }
  }
  return runs.length ? runs : [{ text: '', options: { fontSize: 14 } }];
}

export const pptxExporter: Exporter = {
  format: 'pptx',
  mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ext: 'pptx',
  async export(project: Project, opts?: ExportOptions): Promise<ExportResult> {
    const includeMedia = opts?.includeMedia ?? true;
    const pptx = new pptxgen();
    pptx.author = 'OmniClip';
    pptx.title = opts?.documentTitle ?? project.name;

    // Title slide
    const title = pptx.addSlide();
    title.addText(opts?.documentTitle ?? project.name, {
      x: 0.5,
      y: 2.4,
      w: 9,
      h: 1.2,
      fontSize: 32,
      bold: true,
      align: 'center',
    });

    for (let i = 0; i < project.pages.length; i++) {
      const page = project.pages[i];
      const slide = pptx.addSlide();
      slide.addText(page.title ?? `Page ${i + 1}`, {
        x: 0.4,
        y: 0.3,
        w: 9.2,
        h: 0.6,
        fontSize: 22,
        bold: true,
      });
      slide.addText(textBlocksToBullets(page.blocks), {
        x: 0.5,
        y: 1.1,
        w: 9,
        h: 4.2,
        valign: 'top',
      });

      // Each image becomes its own slide for clarity.
      if (includeMedia) {
        for (const block of page.blocks) {
          if ((block.type === 'image' || block.type === 'region') && block.asset?.base64) {
            const imgSlide = pptx.addSlide();
            imgSlide.addImage({
              data: `data:${block.asset.mime ?? 'image/png'};base64,${block.asset.base64}`,
              x: 0.5,
              y: 0.5,
              w: 9,
              h: 5,
              sizing: { type: 'contain', w: 9, h: 5 },
            });
            if (block.caption) {
              imgSlide.addText(block.caption, { x: 0.5, y: 5.6, w: 9, h: 0.5, fontSize: 12, italic: true });
            }
          }
        }
      }
    }

    const out = (await pptx.write({ outputType: 'arraybuffer' })) as ArrayBuffer;
    return {
      filename: `${safeFilename(project.name)}.pptx`,
      mime: this.mime,
      data: new Uint8Array(out),
    };
  },
};
