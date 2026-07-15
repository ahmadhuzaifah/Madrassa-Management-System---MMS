import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

export function FilesPage() {
  const { files, handleFileUpload, deleteFile } = useAppContext();
  const [dragging, setDragging] = useState(false);

  return (
    <section className="panel" onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={async (e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files?.[0]; if (!file) return; const input = new DataTransfer(); input.items.add(file); await handleFileUpload({ target: { files: input.files } } as any); }}>
      <h3>Files</h3>
      <p>{dragging ? 'Drop to upload' : 'Drag and drop files here'}</p>
      <input type="file" onChange={handleFileUpload} />
      <div className="list-view">
        {files.length === 0 ? <p>No files uploaded.</p> : files.map((file) => (
          <div key={file.id} className="mini-card">
            <strong>{file.originalName}</strong>
            <p>{file.mimeType}</p>
            <small>{file.sizeBytes ?? 0} bytes</small>
            <div className="button-row">
              <a className="ghost-button" href={`/api/files/${file.id}/download`} target="_blank" rel="noreferrer">Download</a>
              <button className="ghost-button" onClick={() => deleteFile(file.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
