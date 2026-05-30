import { MSG, type RuntimeMessage } from '@omniclip/shared';
import { ElementPicker } from './picker.js';
import './picker.css';

const picker = new ElementPicker(
  (block) => {
    chrome.runtime.sendMessage({ type: MSG.PICKER_CAPTURED, block } satisfies RuntimeMessage);
  },
  () => {
    picker.setMode('off');
    chrome.runtime.sendMessage({ type: MSG.PICKER_CANCELLED } satisfies RuntimeMessage);
  },
);

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message.type === MSG.PICKER_SET_MODE) {
    picker.setMode(message.mode);
    sendResponse({ ok: true });
  }
  return false;
});
