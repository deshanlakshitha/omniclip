import { useState } from 'react';
import { type ExportFormat } from '@omniclip/shared';
import { EXPORT_FORMATS } from '@omniclip/export-core';

interface Props {
  saveStatus: string;
  onExport: (format: ExportFormat) => void;
  exporting: boolean;
}

export function ExportBar({ saveStatus, onExport, exporting }: Props) {
  const [format, setFormat] = useState<ExportFormat>('docx');
  return (
    <div className="export-bar">
      <span className="save-status">{saveStatus}</span>
      <span className="spacer" />
      <select value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
        {EXPORT_FORMATS.map((f) => (
          <option key={f.format} value={f.format}>
            {f.label}
          </option>
        ))}
      </select>
      <button className="btn btn-primary" disabled={exporting} onClick={() => onExport(format)}>
        {exporting ? 'Exporting…' : '⬇ Export'}
      </button>
    </div>
  );
}
