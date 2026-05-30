import { type PickerMode } from '@omniclip/shared';

interface Props {
  pickerMode: PickerMode;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  onPick: (mode: PickerMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDeselect: () => void;
}

export function Toolbar({
  pickerMode,
  canUndo,
  canRedo,
  hasSelection,
  onPick,
  onUndo,
  onRedo,
  onDeselect,
}: Props) {
  return (
    <div className="toolbar">
      <button
        className={`btn ${pickerMode === 'element' ? 'btn-active' : 'btn-primary'}`}
        onClick={() => onPick(pickerMode === 'element' ? 'off' : 'element')}
        title="Pick a single element"
      >
        {pickerMode === 'element' ? '◉ Picking…' : '＋ Pick element'}
      </button>
      <button
        className={`btn ${pickerMode === 'region' ? 'btn-active' : ''}`}
        onClick={() => onPick(pickerMode === 'region' ? 'off' : 'region')}
        title="Drag a rectangle to capture a region"
      >
        ▭ Region
      </button>
      <span className="spacer" />
      <button className="btn icon" disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)">
        ↶
      </button>
      <button className="btn icon" disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Shift+Z)">
        ↷
      </button>
      <button className="btn icon" disabled={!hasSelection} onClick={onDeselect} title="Deselect (Esc)">
        ✕
      </button>
    </div>
  );
}
