import { type Project } from '@omniclip/shared';

interface Props {
  project: Project;
  activePageId: string;
  onSelect: (pageId: string) => void;
  onAdd: () => void;
  onDelete: (pageId: string) => void;
  onMove: (from: number, to: number) => void;
}

export function PageTabs({ project, activePageId, onSelect, onAdd, onDelete, onMove }: Props) {
  return (
    <div className="page-tabs">
      {project.pages.map((page, idx) => (
        <div
          key={page.id}
          className={`page-tab ${page.id === activePageId ? 'active' : ''}`}
          onClick={() => onSelect(page.id)}
        >
          <span className="page-tab-label">{page.title ?? `Page ${idx + 1}`}</span>
          <span className="page-tab-count">{page.blocks.length}</span>
          <button
            className="page-tab-move"
            title="Move left"
            disabled={idx === 0}
            onClick={(e) => {
              e.stopPropagation();
              onMove(idx, idx - 1);
            }}
          >
            ‹
          </button>
          <button
            className="page-tab-move"
            title="Move right"
            disabled={idx === project.pages.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              onMove(idx, idx + 1);
            }}
          >
            ›
          </button>
          <button
            className="page-tab-del"
            title="Delete page"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(page.id);
            }}
          >
            🗑
          </button>
        </div>
      ))}
      <button className="page-tab add" onClick={onAdd} title="Add page">
        ＋
      </button>
    </div>
  );
}
