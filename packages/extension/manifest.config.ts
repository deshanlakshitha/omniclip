import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'OmniClip — capture anything to documents',
  description:
    'Select any element on a page (text, images, video, UI blocks) and compile it into DOCX, PDF, PPTX, TXT, Markdown or HTML.',
  version: '0.1.0',
  action: {
    default_title: 'Open OmniClip panel',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  side_panel: {
    default_path: 'index.html',
  },
  permissions: ['activeTab', 'scripting', 'downloads', 'storage', 'sidePanel', 'contextMenus'],
  host_permissions: ['<all_urls>'],
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
});
