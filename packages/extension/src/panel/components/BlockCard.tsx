import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type Block, type Project } from '@omniclip/shared';

interface Props {
  block: Block;
  pageId: string;
  project: Project;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Block>) => void;
  onDelete: () => void;
  onDownloadAsset: () => void;
  onMoveToPage: (toPageId: string) => void;
  downloading: boolean;
}

const TYPE_ICON: Record<string, string> = {
  text: '¶',
  heading: 'H',
  image: '🖼',
  video: '🎬',
  list: '☰',
  table: '▦',
  code: '</>',
  region: '▭',
};

export function BlockCard({
  block,
  pageId,
  project,
  selected,
  onSelect,
  onChange,
  onDelete,
  onDownloadAsset,
  onMoveToPage,
  downloading,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const [showMove, setShowMove] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const editableText = ['text', 'heading', 'code', 'list', 'region'].includes(block.type);
  const isMedia = block.type === 'image' || block.type === 'video';
  const previewSrc = block.asset?.base64
    ? `data:${block.asset.mime ?? 'image/png'};base64,${block.asset.base64}`
    : block.asset?.src;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`block-card ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="block-head">
        <span className="drag-handle" {...attributes} {...listeners} title="Drag to reorder">
          ⠿
        </span>
        <span className="block-type">{TYPE_ICON[block.type] ?? '•'} {block.type}</span>
        <span className="spacer" />
        <button className="mini" title="Move to page" onClick={(e) => { e.stopPropagation(); setShowMove((v) => !v); }}>
          ⇄
        </button>
        <button className="mini danger" title="Delete block" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          🗑
        </button>
      </div>

      {showMove && (
        <div className="move-menu" onClick={(e) => e.stopPropagation()}>
          {project.pages
            .filter((p) => p.id !== pageId)
            .map((p, i) => (
              <button key={p.id} className="mini" onClick={() => { onMoveToPage(p.id); setShowMove(false); }}>
                → {p.title ?? `Page ${i + 1}`}
              </button>
            ))}
          {project.pages.length <= 1 && <span className="hint">No other pages</span>}
        </div>
      )}

      {block.type === 'table' ? (
        <table className="block-table">
          <tbody>
            {(block.rows ?? []).slice(0, 6).map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : isMedia ? (
        <div className="media-preview">
          {block.type === 'image' && previewSrc ? (
            <img src={previewSrc} alt={block.caption ?? ''} />
          ) : (
            <div className="video-chip">🎬 {block.asset?.src || 'video'}</div>
          )}
          <div className="media-actions">
            <button className="mini" disabled={downloading || !block.asset?.src} onClick={(e) => { e.stopPropagation(); onDownloadAsset(); }}>
              {block.asset?.downloaded ? '✓ Downloaded' : downloading ? 'Downloading…' : '⬇ Download & embed'}
            </button>
          </div>
          <input
            className="caption-input"
            placeholder="Caption…"
            value={block.caption ?? ''}
            onChange={(e) => onChange({ caption: e.target.value })}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : editableText ? (
        <textarea
          className="block-text"
          value={block.text ?? ''}
          rows={Math.min(10, Math.max(2, (block.text ?? '').split('\n').length))}
          onChange={(e) => onChange({ text: e.target.value })}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="block-text-ro">{block.text}</div>
      )}

      <div className="block-source" title={block.source.url}>
        {block.source.title || block.source.url}
      </div>
    </div>
  );
}
