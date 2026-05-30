import { type ExportFormat, type ExportOptions, type ExportResult, type Project } from '@omniclip/shared';
import { type Exporter } from './exporter.js';
import { htmlExporter, mdExporter, txtExporter } from './text-exporters.js';
import { docxExporter } from './docx.js';
import { pdfExporter } from './pdf.js';
import { pptxExporter } from './pptx.js';

export * from './exporter.js';

export const exporters: Record<ExportFormat, Exporter> = {
  txt: txtExporter,
  md: mdExporter,
  html: htmlExporter,
  docx: docxExporter,
  pdf: pdfExporter,
  pptx: pptxExporter,
};

export const EXPORT_FORMATS: { format: ExportFormat; label: string }[] = [
  { format: 'docx', label: 'Word (.docx)' },
  { format: 'pdf', label: 'PDF (.pdf)' },
  { format: 'pptx', label: 'PowerPoint (.pptx)' },
  { format: 'md', label: 'Markdown (.md)' },
  { format: 'html', label: 'HTML (.html)' },
  { format: 'txt', label: 'Plain text (.txt)' },
];

export async function exportProject(
  project: Project,
  format: ExportFormat,
  opts?: ExportOptions,
): Promise<ExportResult> {
  const exporter = exporters[format];
  if (!exporter) throw new Error(`No exporter for format: ${format}`);
  return exporter.export(project, opts);
}
