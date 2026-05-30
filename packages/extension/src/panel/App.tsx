import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  MSG,
  type ExportFormat,
  type PickerMode,
  type RuntimeMessage,
} from '@omniclip/shared';
import { useStore } from './store.js';
import { useTemporalState } from './useTemporal.js';
import { Toolbar } from './components/Toolbar.js';
import { PageTabs } from './components/PageTabs.js';
import { BlockCard } from './components/BlockCard.js';
import { ExportBar } from './components/ExportBar.js';
import { createAutoSaver, loadActiveProject } from './storage.js';
import { downloadAsset, exportAndDownload } from './download.js';

const autoSave = createAutoSaver(800);

async function sendPickerMode(mode: PickerMode) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id != null) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: MSG.PICKER_SET_MODE, mode } satisfies RuntimeMessage);
    } catch {
      // content script not present on this page (e.g. chrome:// pages)
    }
  }
}

export function App() {
  const project = useStore((s) => s.project);
  const activePageId = useStore((s) => s.activePageId);
  const pickerMode = useStore((s) => s.pickerMode);
  const selectedBlockId = useStore((s) => s.selectedBlockId);
  const { canUndo, canRedo } = useTemporalState();

  const [saveStatus, setSaveStatus] = useState('Saved');
  const [exporting, setExporting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const activePage = project.pages.find((p) => p.id === activePageId) ?? project.pages[0];

  // Load persisted project once on mount.
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadActiveProject().then((p) => {
      if (p) useStore.getState().setProject(p);
    });
  }, []);

  // Auto-save whenever the project changes.
  useEffect(() => {
    setSaveStatus('Saving…');
    autoSave(project);
    const t = setTimeout(() => setSaveStatus('Saved'), 900);
    return () => clearTimeout(t);
  }, [project]);

  // Receive captured blocks + picker cancellation.
  useEffect(() => {
    const handler = (message: RuntimeMessage) => {
      if (message.type === MSG.PICKER_CAPTURED) {
        useStore.getState().addCapturedBlock(message.block);
      } else if (message.type === MSG.PICKER_CANCELLED) {
        useStore.getState().setPickerMode('off');
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  const setPicker = useCallback((mode: PickerMode) => {
    useStore.getState().setPickerMode(mode);
    void sendPickerMode(mode);
  }, []);

  const deselect = useCallback(() => {
    useStore.getState().selectBlock(null);
    if (useStore.getState().pickerMode !== 'off') setPicker('off');
  }, [setPicker]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        useStore.temporal.getState().undo();
      } else if (meta && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        useStore.temporal.getState().redo();
      } else if (e.key === 'Escape') {
        deselect();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deselect]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = activePage.blocks.map((b) => b.id);
    const newIndex = ids.indexOf(over.id as string);
    useStore.getState().moveBlock(activePage.id, activePage.id, active.id as string, newIndex);
  };

  const onExport = async (format: ExportFormat) => {
    setExporting(true);
    try {
      await exportAndDownload(project, format);
    } catch (err) {
      alert(`Export failed: ${String((err as Error)?.message ?? err)}`);
    } finally {
      setExporting(false);
    }
  };

  const onDownloadAsset = async (blockId: string, url: string) => {
    setDownloadingId(blockId);
    try {
      const res = await downloadAsset(url, blockId);
      if (res.ok && res.base64) {
        // Re-read fresh state: the block may have been deleted/edited during the async fetch.
        const block = useStore
          .getState()
          .project.pages.flatMap((p) => p.blocks)
          .find((b) => b.id === blockId);
        if (!block?.asset) return;
        useStore.getState().updateBlock(blockId, {
          asset: { ...block.asset, base64: res.base64, mime: res.mime, downloaded: true },
        });
      } else {
        alert(`Download failed: ${res.error ?? 'unknown error'}`);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const totalBlocks = project.pages.reduce((n, p) => n + p.blocks.length, 0);

  return (
    <div className="app">
      <header className="app-header">
        <input
          className="project-name"
          value={project.name}
          onChange={(e) => useStore.getState().renameProject(e.target.value)}
        />
        <span className="block-count">{totalBlocks} blocks</span>
      </header>

      <Toolbar
        pickerMode={pickerMode}
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={selectedBlockId !== null || pickerMode !== 'off'}
        onPick={setPicker}
        onUndo={() => useStore.temporal.getState().undo()}
        onRedo={() => useStore.temporal.getState().redo()}
        onDeselect={deselect}
      />

      <PageTabs
        project={project}
        activePageId={activePage.id}
        onSelect={(id) => useStore.getState().setActivePage(id)}
        onAdd={() => useStore.getState().addPage()}
        onDelete={(id) => useStore.getState().deletePage(id)}
        onMove={(from, to) => useStore.getState().movePage(from, to)}
      />

      <main className="block-list">
        {activePage.blocks.length === 0 ? (
          <div className="empty">
            <p>Nothing captured yet.</p>
            <p className="hint">
              Click <b>Pick element</b>, then hover and click any text, image, video or block on the page.
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={activePage.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              {activePage.blocks.map((block) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  pageId={activePage.id}
                  project={project}
                  selected={selectedBlockId === block.id}
                  downloading={downloadingId === block.id}
                  onSelect={() => useStore.getState().selectBlock(block.id)}
                  onChange={(patch) => useStore.getState().updateBlock(block.id, patch)}
                  onDelete={() => useStore.getState().deleteBlock(activePage.id, block.id)}
                  onDownloadAsset={() => block.asset?.src && onDownloadAsset(block.id, block.asset.src)}
                  onMoveToPage={(toPageId) =>
                    useStore.getState().moveBlock(activePage.id, toPageId, block.id, 0)
                  }
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </main>

      <ExportBar saveStatus={saveStatus} onExport={onExport} exporting={exporting} />
    </div>
  );
}
