import {
  projectToMarkdown,
  projectToPlainText,
  type ExportOptions,
  type ExportResult,
  type Project,
} from '@omniclip/shared';
import { type Exporter, safeFilename, textToBytes } from './exporter.js';
import { projectToHtml } from './html.js';

export const txtExporter: Exporter = {
  format: 'txt',
  mime: 'text/plain',
  ext: 'txt',
  async export(project: Project): Promise<ExportResult> {
    return {
      filename: `${safeFilename(project.name)}.txt`,
      mime: this.mime,
      data: textToBytes(projectToPlainText(project)),
    };
  },
};

export const mdExporter: Exporter = {
  format: 'md',
  mime: 'text/markdown',
  ext: 'md',
  async export(project: Project): Promise<ExportResult> {
    return {
      filename: `${safeFilename(project.name)}.md`,
      mime: this.mime,
      data: textToBytes(projectToMarkdown(project)),
    };
  },
};

export const htmlExporter: Exporter = {
  format: 'html',
  mime: 'text/html',
  ext: 'html',
  async export(project: Project, opts?: ExportOptions): Promise<ExportResult> {
    return {
      filename: `${safeFilename(project.name)}.html`,
      mime: this.mime,
      data: textToBytes(projectToHtml(project, opts)),
    };
  },
};
