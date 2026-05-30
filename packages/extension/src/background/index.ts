import { MSG, type RuntimeMessage } from '@omniclip/shared';

// Open the side panel when the toolbar icon is clicked.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.warn('[omniclip] sidePanel behavior', err));

  chrome.contextMenus.create({
    id: 'omniclip-capture',
    title: 'Capture to OmniClip',
    contexts: ['selection', 'image', 'video', 'page'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'omniclip-capture' && tab?.id != null) {
    chrome.tabs.sendMessage(tab.id, { type: MSG.PICKER_SET_MODE, mode: 'element' } satisfies RuntimeMessage);
  }
});

async function fetchAsBase64(url: string): Promise<{ base64: string; mime: string }> {
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const mime = res.headers.get('content-type') ?? 'application/octet-stream';
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return { base64: btoa(binary), mime };
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message.type === MSG.DOWNLOAD_ASSET) {
    fetchAsBase64(message.url)
      .then(({ base64, mime }) =>
        sendResponse({ type: MSG.DOWNLOAD_RESULT, blockId: message.blockId, ok: true, base64, mime }),
      )
      .catch((err) =>
        sendResponse({
          type: MSG.DOWNLOAD_RESULT,
          blockId: message.blockId,
          ok: false,
          error: String(err?.message ?? err),
        }),
      );
    return true; // async response
  }
  return false;
});
