import { MSG, type ExportFormat, type Project, type RuntimeMessage } from '@omniclip/shared';
import { exportProject } from '@omniclip/export-core';

/** Ask the background worker to fetch an asset (avoids page CORS) → base64. */
export function downloadAsset(
  url: string,
  blockId: string,
): Promise<{ ok: boolean; base64?: string; mime?: string; error?: string }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: MSG.DOWNLOAD_ASSET, url, blockId } satisfies RuntimeMessage,
      (resp: RuntimeMessage) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        if (resp && resp.type === MSG.DOWNLOAD_RESULT) {
          resolve({ ok: resp.ok, base64: resp.base64, mime: resp.mime, error: resp.error });
        } else {
          resolve({ ok: false, error: 'no response' });
        }
      },
    );
  });
}

/** Trigger a browser download of bytes. */
function saveBytes(filename: string, mime: string, data: Uint8Array) {
  const blob = new Blob([data as unknown as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function exportAndDownload(project: Project, format: ExportFormat): Promise<void> {
  const result = await exportProject(project, format, {
    includeMedia: true,
    documentTitle: project.name,
  });
  saveBytes(result.filename, result.mime, result.data);
}
