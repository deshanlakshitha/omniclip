import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import {
  type Block,
  type PickerMode,
  type Project,
  addBlock as addBlockOp,
  addPage as addPageOp,
  createProject,
  deleteBlock as deleteBlockOp,
  deletePage as deletePageOp,
  moveBlock as moveBlockOp,
  movePage as movePageOp,
  updateBlock as updateBlockOp,
} from '@omniclip/shared';

export interface OmniState {
  project: Project;
  activePageId: string;
  pickerMode: PickerMode;
  selectedBlockId: string | null;

  setProject: (project: Project) => void;
  setActivePage: (pageId: string) => void;
  setPickerMode: (mode: PickerMode) => void;
  selectBlock: (id: string | null) => void;

  addCapturedBlock: (block: Block) => void;
  addPage: () => void;
  deletePage: (pageId: string) => void;
  movePage: (from: number, to: number) => void;
  deleteBlock: (pageId: string, blockId: string) => void;
  updateBlock: (blockId: string, patch: Partial<Block>) => void;
  moveBlock: (fromPageId: string, toPageId: string, blockId: string, toIndex: number) => void;
  renameProject: (name: string) => void;
}

const initial = createProject();

export const useStore = create<OmniState>()(
  temporal(
    immer((set) => ({
      project: initial,
      activePageId: initial.pages[0].id,
      pickerMode: 'off',
      selectedBlockId: null,

      setProject: (project) =>
        set((s) => {
          s.project = project;
          s.activePageId = project.pages[0]?.id ?? '';
        }),
      setActivePage: (pageId) =>
        set((s) => {
          s.activePageId = pageId;
        }),
      setPickerMode: (mode) =>
        set((s) => {
          s.pickerMode = mode;
        }),
      selectBlock: (id) =>
        set((s) => {
          s.selectedBlockId = id;
        }),

      addCapturedBlock: (block) =>
        set((s) => {
          s.project = addBlockOp(s.project, s.activePageId, block);
        }),
      addPage: () =>
        set((s) => {
          s.project = addPageOp(s.project);
          s.activePageId = s.project.pages[s.project.pages.length - 1].id;
        }),
      deletePage: (pageId) =>
        set((s) => {
          s.project = deletePageOp(s.project, pageId);
          if (!s.project.pages.find((p) => p.id === s.activePageId)) {
            s.activePageId = s.project.pages[0].id;
          }
        }),
      movePage: (from, to) =>
        set((s) => {
          s.project = movePageOp(s.project, from, to);
        }),
      deleteBlock: (pageId, blockId) =>
        set((s) => {
          s.project = deleteBlockOp(s.project, pageId, blockId);
          if (s.selectedBlockId === blockId) s.selectedBlockId = null;
        }),
      updateBlock: (blockId, patch) =>
        set((s) => {
          s.project = updateBlockOp(s.project, blockId, patch);
        }),
      moveBlock: (fromPageId, toPageId, blockId, toIndex) =>
        set((s) => {
          s.project = moveBlockOp(s.project, fromPageId, toPageId, blockId, toIndex);
        }),
      renameProject: (name) =>
        set((s) => {
          s.project.name = name;
        }),
    })),
    {
      limit: 100,
      // Only the document is part of undo/redo history.
      partialize: (state) => ({ project: state.project }),
      equality: (a, b) => a.project === b.project,
    },
  ),
);

export const useTemporal = () => useStore.temporal;
