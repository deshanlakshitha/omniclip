import { type ExportFormat, type ExportOptions, type ExportResult, type Project } from '@omniclip/shared';

/** Common interface every format exporter implements. */
export interface Exporter {
  format: ExportFormat;
  mime: string;
  ext: string;
  export(project: Project, opts?: ExportOptions): Promise<ExportResult>;
}

export function safeFilename(name: string): string {
  return (name || 'omniclip').replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-') || 'omniclip';
}

/** Decode a base64 string (no data: prefix) to bytes, in browser or node. */
export function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Node fallback
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

export function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}
