import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';

const FileViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [file, setFile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [annotationMode, setAnnotationMode] = useState<'none' | 'highlight' | 'textbox' | 'draw'>('none');
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [editingSharing, setEditingSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const resp = await api.get('/files');
        const found = (resp.data || []).find((f: any) => String(f.id) === String(id));
        if (!found) {
          alert('File not found or not accessible');
          navigate('/dashboard/pdf', { replace: true });
          return;
        }
        setFile(found);
        setAnnotations(found.annotations || []);
        setEditingSharing(!!found.isShared);
      } catch (e) {
        console.error('Failed to load file', e);
        alert('Failed to load file');
        navigate('/dashboard/pdf', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async () => {
    if (!file) return;
    try {
      setIsLoading(true);
      await api.put(`/files/${file.id}`, {
        annotations,
        isShared: user?.role === 'staff' ? editingSharing : undefined,
      });
      alert(`Saved ${annotations.length} annotation(s)`);
    } catch (e) {
      console.error('Save failed', e);
      alert('Save failed');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFullscreen = () => setIsFullscreen(v => !v);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (annotationMode !== 'draw') return;
    setIsDrawing(true);
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d'); if (ctx) { ctx.beginPath(); ctx.moveTo(x, y); }
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || annotationMode !== 'draw') return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d'); if (ctx) { ctx.lineTo(x, y); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.stroke(); }
  };
  const stopDrawing = () => {
    if (isDrawing && annotationMode === 'draw') {
      setIsDrawing(false);
      setAnnotations(prev => ([...prev, { id: Date.now().toString(), type: 'drawing', content: 'Hand drawn', page: 1, timestamp: new Date().toISOString() }]));
    }
  };

  const handlePDFClick = () => {
    if (annotationMode === 'highlight') {
      setAnnotations(prev => ([...prev, { id: Date.now().toString(), type: 'highlight', content: 'Highlighted area', page: 1, timestamp: new Date().toISOString() }]));
    } else if (annotationMode === 'textbox') {
      const text = prompt('Enter text for annotation:');
      if (text) setAnnotations(prev => ([...prev, { id: Date.now().toString(), type: 'text', content: text, page: 1, timestamp: new Date().toISOString() }]));
    }
  };

  const openRawInNewTab = () => {
    if (!file) return;
    const url: string = file.fileUrl || file.fileData;
    if (!url) return alert('No file URL found');
    try {
      if (/^data:/i.test(url)) {
        const match = url.match(/^data:(.*?);base64,(.*)$/);
        if (match) {
          const mime = match[1] || 'application/octet-stream';
          const b64 = match[2];
          const byteChars = atob(b64);
          const byteNumbers = new Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mime });
          const objectUrl = URL.createObjectURL(blob);
          const win = window.open(objectUrl, '_blank');
          if (!win) alert('Please allow popups for this site');
          setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
          return;
        }
      }
      const win = window.open(url, '_blank');
      if (!win) alert('Please allow popups for this site');
    } catch (e) {
      console.error('Open raw failed', e);
      alert('Failed to open file');
    }
  };

  if (!file) {
    return (
      <div className="h-screen w-screen flex items-center justify-center text-gray-600">
        {isLoading ? 'Loading file…' : 'No file selected'}
      </div>
    );
  }

  const isPDF = String(file.filename).toLowerCase().endsWith('.pdf');
  const isPublic = !!(file.fileUrl && /^https?:\/\//i.test(file.fileUrl));

  return (
    <div className={`h-screen w-screen flex flex-col ${isFullscreen ? 'bg-white' : 'bg-gray-50'}`}>
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <div className="text-base font-medium text-gray-900">{file.title}</div>
            <div className="text-xs text-gray-600">{file.filename}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAnnotationMode(m => m === 'highlight' ? 'none' : 'highlight')} className={`px-3 py-1 rounded-md text-sm ${annotationMode === 'highlight' ? 'bg-yellow-600 text-white' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}>Highlight</button>
            <button onClick={() => setAnnotationMode(m => m === 'textbox' ? 'none' : 'textbox')} className={`px-3 py-1 rounded-md text-sm ${annotationMode === 'textbox' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>Text Box</button>
            <button onClick={() => setAnnotationMode(m => m === 'draw' ? 'none' : 'draw')} className={`px-3 py-1 rounded-md text-sm ${annotationMode === 'draw' ? 'bg-green-600 text-white' : 'bg-green-500 text-white hover:bg-green-600'}`}>{annotationMode === 'draw' ? '✏️ Drawing' : 'Draw'}</button>
            <button onClick={handleSave} disabled={isLoading} className="bg-purple-600 text-white px-3 py-1 rounded-md text-sm disabled:opacity-50">{isLoading ? 'Saving…' : `💾 Save (${annotations.length})`}</button>
            <button onClick={toggleFullscreen} className="bg-gray-700 text-white px-3 py-1 rounded-md text-sm">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</button>
            <button onClick={openRawInNewTab} className="bg-primary-600 text-white px-3 py-1 rounded-md text-sm">Open Raw</button>
          </div>
          {user?.role === 'staff' && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="w-4 h-4" checked={editingSharing} onChange={(e) => setEditingSharing(e.target.checked)} />
              Share with students
            </label>
          )}
        </div>
      </div>

      {/* Viewer */}
      <div className={`flex-1 overflow-auto ${isFullscreen ? '' : 'p-3'}`}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-full">
          <div className="relative w-full" onClick={handlePDFClick}>
            {isPDF ? (
              <iframe
                src={file.fileData || file.fileUrl}
                width="100%"
                height={isFullscreen ? window.innerHeight - 140 : 700}
                style={{ pointerEvents: annotationMode !== 'none' ? 'none' as const : 'auto' }}
                title={file.title}
              />
            ) : isPublic ? (
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.fileUrl)}`}
                width="100%"
                height={isFullscreen ? window.innerHeight - 140 : 700}
                style={{ pointerEvents: annotationMode !== 'none' ? 'none' as const : 'auto' }}
                title={file.title}
              />
            ) : (
              <div className="w-full flex items-center justify-center text-sm text-gray-600" style={{ height: isFullscreen ? window.innerHeight - 140 : 700 }}>
                PowerPoint inline preview requires a public URL. Use Draw mode here, or Open Raw.
              </div>
            )}

            {annotationMode === 'draw' && (
              <canvas
                ref={canvasRef}
                width={isFullscreen ? window.innerWidth - 20 : 1200}
                height={isFullscreen ? window.innerHeight - 180 : 700}
                className="absolute top-0 left-0 cursor-crosshair"
                style={{ width: '100%', height: isFullscreen ? window.innerHeight - 140 : 700, zIndex: 10, pointerEvents: 'auto' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            )}

            {annotationMode !== 'none' && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-md text-sm z-20">
                {annotationMode === 'highlight' && '📝 Click to mark highlight'}
                {annotationMode === 'textbox' && '📝 Click to add text annotation'}
                {annotationMode === 'draw' && '✏️ Click and drag to draw'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileViewerPage;
