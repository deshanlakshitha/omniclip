import { type Block } from './types.js';

/** Message protocol between content script, background worker and side panel. */

export type PickerMode = 'element' | 'region' | 'off';

export type RuntimeMessage =
  | { type: 'PICKER_SET_MODE'; mode: PickerMode }
  | { type: 'PICKER_CAPTURED'; block: Block }
  | { type: 'PICKER_CANCELLED' }
  | { type: 'DOWNLOAD_ASSET'; url: string; blockId: string }
  | {
      type: 'DOWNLOAD_RESULT';
      blockId: string;
      ok: boolean;
      base64?: string;
      mime?: string;
      error?: string;
    };

export const MSG = {
  PICKER_SET_MODE: 'PICKER_SET_MODE',
  PICKER_CAPTURED: 'PICKER_CAPTURED',
  PICKER_CANCELLED: 'PICKER_CANCELLED',
  DOWNLOAD_ASSET: 'DOWNLOAD_ASSET',
  DOWNLOAD_RESULT: 'DOWNLOAD_RESULT',
} as const;
