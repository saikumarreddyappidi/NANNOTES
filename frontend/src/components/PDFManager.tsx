import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';

const PDFManager: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [selectedPDF, setSelectedPDF] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [annotationMode, setAnnotationMode] = useState<'none' | 'highlight' | 'textbox' | 'draw'>('none');
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [editingSharing, setEditingSharing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load saved PDFs
  useEffect(() => {
    loadSavedPDFs();
  }, []);

  const loadSavedPDFs = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/files');
      setPdfs(response.data);
    } catch (error) {
      console.error('Error loading saved PDFs:', error);
      setPdfs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    if (!allowed.includes(file.type)) {
      alert('Please select a PDF or PowerPoint file (.pdf, .ppt, .pptx)');
      return;
    }

    setIsUploading(true);
    
    try {
      // Convert file to base64 for API upload
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const fileData = e.target?.result as string;
          
          const response = await api.post('/files/upload', {
            filename: file.name,
            fileData: fileData,
            isShared: user?.role === 'staff' ? isShared : false
          });

          setPdfs(prev => [response.data, ...prev]);
          // Auto-select and open the newly uploaded file
          setSelectedPDF(response.data);
          setIsShared(false);
          alert('PDF uploaded successfully!');
        } catch (error) {
          console.error('API upload failed:', error);
          alert('Failed to upload PDF. Please try again.');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload PDF');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSelectPDF = (pdf: any) => {
    setSelectedPDF(pdf);
  };

  const handleViewPDF = (pdf: any) => {
    // For PPT/PPTX prefer opening the full viewer in a new tab
    const isPpt = typeof pdf?.filename === 'string' && /\.(ppt|pptx)$/i.test(pdf.filename);
    if (isPpt) {
      const url = `/file/${pdf.id}/view`;
      const abs = `${window.location.origin}${url}`;
      const win = window.open(abs, '_blank');
      if (!win) alert('Please allow popups to open the viewer');
      return;
    }
    // Inline for PDFs
    setSelectedPDF(pdf);
  };

  const openInNewTab = (pdf: any) => {
    try {
      const url: string = pdf.fileUrl || pdf.fileData;
      if (!url) {
        alert('No file URL available to open');
        return;
      }
      // If PPT/PPTX and we have a public URL, use Office Web Viewer
      const isPpt = typeof pdf?.filename === 'string' && /\.(ppt|pptx)$/i.test(pdf.filename);
      if (isPpt && /^https?:\/\//i.test(url)) {
        const ov = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
        const win = window.open(ov, '_blank');
        if (!win) alert('Please allow popups for this site');
        return;
      }
      if (/^data:/i.test(url)) {
        // Convert data URL to Blob for better browser handling, esp. PPT/PPTX
        const match = url.match(/^data:(.*?);base64,(.*)$/);
        if (!match) {
          const win = window.open(url, '_blank');
          if (!win) alert('Please allow popups for this site');
          return;
        }
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
        // Optional: revoke later
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        return;
      }
      const win = window.open(url, '_blank');
      if (!win) alert('Please allow popups for this site');
    } catch (e) {
      console.error('Open in new tab failed:', e);
      alert('Failed to open file in a new tab');
    }
  };

  const handleDeletePDF = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this PDF?')) {
      try {
        setIsLoading(true);
        await api.delete(`/files/${id}`);
        setPdfs(prev => prev.filter(pdf => pdf.id !== id));
        if (selectedPDF?.id === id) {
          setSelectedPDF(null);
        }
        alert('PDF deleted successfully!');
      } catch (error) {
        console.error('Error deleting PDF:', error);
        alert('Failed to delete PDF. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDownload = (pdf: any) => {
    // Create a download link
    const link = document.createElement('a');
    link.href = pdf.fileUrl;
    link.download = pdf.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Annotation handlers
  const handleHighlight = () => {
    setAnnotationMode(annotationMode === 'highlight' ? 'none' : 'highlight');
  };

  const handleTextBox = () => {
    setAnnotationMode(annotationMode === 'textbox' ? 'none' : 'textbox');
    if (annotationMode !== 'textbox') {
      const text = prompt('Enter text for annotation:');
      if (text) {
        const newAnnotation = {
          id: Date.now().toString(),
          type: 'text',
          content: text,
          page: 1,
          timestamp: new Date().toISOString()
        };
        setAnnotations(prev => [...prev, newAnnotation]);
      }
    }
  };

  const handleDraw = () => {
    setAnnotationMode(annotationMode === 'draw' ? 'none' : 'draw');
  };

  const handleSaveAnnotations = async () => {
    if (!selectedPDF) return;
    
    try {
      setIsLoading(true);
      // Update the selected PDF with annotations
      const updatedPDF = {
        ...selectedPDF,
        annotations: annotations
      };
      
      await api.put(`/files/${selectedPDF.id}`, {
        annotations: annotations,
        isShared: user?.role === 'staff' ? editingSharing : undefined
      });
      
      // Update the PDFs list
      setPdfs(prev => prev.map(pdf => 
        pdf.id === selectedPDF.id ? updatedPDF : pdf
      ));
      
      setSelectedPDF(updatedPDF);
      alert(`Saved ${annotations.length} annotation(s) successfully!`);
    } catch (error) {
      console.error('Error saving annotations:', error);
      alert('Failed to save annotations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (annotationMode !== 'draw') return;
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || annotationMode !== 'draw') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing && annotationMode === 'draw') {
      setIsDrawing(false);
      const newAnnotation = {
        id: Date.now().toString(),
        type: 'drawing',
        content: 'Hand drawn annotation',
        page: 1,
        timestamp: new Date().toISOString()
      };
      setAnnotations(prev => [...prev, newAnnotation]);
    }
  };

  // Handle click on PDF for highlight/textbox modes
  const handlePDFClick = (e: React.MouseEvent) => {
    if (annotationMode === 'highlight') {
      const newAnnotation = {
        id: Date.now().toString(),
        type: 'highlight',
        content: 'Highlighted text area',
        page: 1,
        timestamp: new Date().toISOString()
      };
      setAnnotations(prev => [...prev, newAnnotation]);
    } else if (annotationMode === 'textbox') {
      const text = prompt('Enter text for annotation:');
      if (text) {
        const newAnnotation = {
          id: Date.now().toString(),
          type: 'text',
          content: text,
          page: 1,
          timestamp: new Date().toISOString()
        };
        setAnnotations(prev => [...prev, newAnnotation]);
      }
    }
  };

  // Load annotations when PDF is selected
  useEffect(() => {
    if (selectedPDF && selectedPDF.annotations) {
      setAnnotations(selectedPDF.annotations);
      setEditingSharing(selectedPDF.isShared || false);
    } else {
      setAnnotations([]);
      setEditingSharing(false);
    }
  }, [selectedPDF]);

  return (
    <div className={`h-full flex flex-col md:flex-row ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {/* PDF List */}
      <div className={`${isFullscreen ? 'hidden' : 'w-full md:w-1/3'} bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Files (PDF / PowerPoint)</h3>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : '+ Upload File'}
            </button>
          </div>
          
          {user?.role === 'staff' && (
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="checkbox"
                id="sharePDF"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="sharePDF" className="text-sm text-gray-700">
                Share uploaded files with students (using your Staff ID)
              </label>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.ppt,.pptx"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && pdfs.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Loading PDFs...</div>
          ) : pdfs.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No PDF files uploaded</p>
            </div>
          ) : (
            pdfs.map((pdf) => (
              <div
                key={pdf.id}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedPDF?.id === pdf.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleSelectPDF(pdf)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 truncate">{pdf.title}</h4>
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewPDF(pdf);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      View
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(pdf);
                      }}
                      className="text-green-600 hover:text-green-800 text-xs"
                    >
                      Download
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePDF(pdf.id);
                      }}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{pdf.filename}</p>
                <p className="text-xs text-gray-500">
                  Uploaded: {new Date(pdf.createdAt).toLocaleDateString()}
                </p>
                {pdf.annotations && pdf.annotations.length > 0 && (
                  <div className="text-xs text-blue-600 font-medium mt-1">
                    {pdf.annotations.length} annotation(s)
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* PDF Viewer */}
  <div className="flex-1 bg-white flex flex-col">
        {selectedPDF ? (
          <div className="flex flex-col h-full">
            {/* PDF Toolbar */}
            <div className="bg-gray-50 border-b border-gray-200 p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">{selectedPDF.title}</h2>
                  <p className="text-sm text-gray-600">{selectedPDF.filename}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={toggleFullscreen}
                    className="bg-purple-500 text-white px-3 py-1 rounded-md text-sm hover:bg-purple-600"
                  >
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </button>
                  <button 
                    onClick={handleHighlight}
                    className={`px-3 py-1 rounded-md text-sm transition-colors ${
                      annotationMode === 'highlight' 
                        ? 'bg-yellow-600 text-white' 
                        : 'bg-yellow-500 text-white hover:bg-yellow-600'
                    }`}
                  >
                    {annotationMode === 'highlight' ? '📝 Highlighting' : 'Highlight'}
                  </button>
                  <button 
                    onClick={handleTextBox}
                    className={`px-3 py-1 rounded-md text-sm transition-colors ${
                      annotationMode === 'textbox' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    Text Box
                  </button>
                  <button 
                    onClick={handleDraw}
                    className={`px-3 py-1 rounded-md text-sm transition-colors ${
                      annotationMode === 'draw' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {annotationMode === 'draw' ? '✏️ Drawing' : 'Draw'}
                  </button>
                  <button 
                    onClick={handleSaveAnnotations}
                    disabled={isLoading}
                    className="bg-purple-500 text-white px-3 py-1 rounded-md text-sm hover:bg-purple-600 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : `💾 Save (${annotations.length})`}
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedPDF) return;
                      const url = `/file/${selectedPDF.id}/view`;
                      const abs = `${window.location.origin}${url}`;
                      window.open(abs, '_blank');
                    }}
                    className="bg-gray-700 text-white px-3 py-1 rounded-md text-sm"
                  >
                    Open in New Tab (Full Viewer)
                  </button>
                </div>
                
                {user?.role === 'staff' && selectedPDF && (
                  <div className="flex items-center space-x-2 mt-3">
                    <input
                      type="checkbox"
                      id="sharePDFEdit"
                      checked={editingSharing}
                      onChange={(e) => setEditingSharing(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="sharePDFEdit" className="text-sm text-gray-700">
                      Share this PDF with students (using your Staff ID)
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* PDF Viewer Area */}
            <div className={`flex-1 overflow-auto bg-gray-100 p-4 ${isFullscreen ? 'p-2' : ''}`}>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-full">
                {/* Try to embed PDF, fallback to manual open */}
                <div className="h-full flex flex-col relative">
                  <div className="flex-1 min-h-96 relative">
                    <div 
                      onClick={handlePDFClick}
                      className={`w-full h-full ${
                        annotationMode === 'highlight' ? 'cursor-text' :
                        annotationMode === 'textbox' ? 'cursor-pointer' :
                        'cursor-default'
                      }`}
                    >
                      {/* Inline preview: if PDF use iframe; if PPT show a local-preview notice */}
                      {String(selectedPDF.filename).toLowerCase().endsWith('.pdf') ? (
                        <iframe
                          src={selectedPDF.fileData || selectedPDF.fileUrl}
                          width="100%"
                          height={isFullscreen ? window.innerHeight - 150 : '100%'}
                          style={{ minHeight: isFullscreen ? window.innerHeight - 150 : '500px', pointerEvents: annotationMode !== 'none' ? 'none' : 'auto' }}
                          title={selectedPDF.title}
                        />
                      ) : (
                        // PPT/PPTX handling: if we have a public URL, use Office Web Viewer, else show local preview notice
                        (selectedPDF.fileUrl && /^https?:\/\//i.test(selectedPDF.fileUrl)) ? (
                          <iframe
                            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(selectedPDF.fileUrl)}`}
                            width="100%"
                            height={isFullscreen ? window.innerHeight - 150 : '100%'}
                            style={{ minHeight: isFullscreen ? window.innerHeight - 150 : '500px', pointerEvents: annotationMode !== 'none' ? 'none' : 'auto' }}
                            title={selectedPDF.title}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm text-gray-600" style={{ minHeight: isFullscreen ? window.innerHeight - 150 : '500px' }}>
                            PowerPoint inline preview requires a public URL. Use Draw mode on this page, or click Open in New Tab.
                          </div>
                        )
                      )}
                    </div>
                    
                    {/* Drawing Canvas Overlay */}
                    {annotationMode === 'draw' && (
                      <canvas
                        ref={canvasRef}
                        width={isFullscreen ? window.innerWidth - 20 : 800}
                        height={isFullscreen ? window.innerHeight - 200 : 500}
                        className="absolute top-0 left-0 cursor-crosshair"
                        style={{ 
                          width: '100%', 
                          height: '100%',
                          zIndex: 10,
                          pointerEvents: annotationMode === 'draw' ? 'auto' : 'none'
                        }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                      />
                    )}
                    
                    {/* Annotation Mode Indicator */}
                    {annotationMode !== 'none' && (
                      <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-md text-sm z-20">
                        {annotationMode === 'highlight' && '📝 Click and drag to highlight'}
                        {annotationMode === 'textbox' && '📝 Click to add text annotation'}
                        {annotationMode === 'draw' && '✏️ Click and drag to draw'}
                      </div>
                    )}
                  </div>
      {!isFullscreen && (
                    <div className="p-4 border-t border-gray-200 text-center">
                      <p className="text-sm text-gray-600 mb-2">
        Can't see the file? Try opening it in a new tab.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openInNewTab(selectedPDF)}
                          className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                        >
                          Open Raw
                        </button>
                        <button
                          onClick={() => {
                            if (!selectedPDF) return;
                            const url = `/file/${selectedPDF.id}/view`;
                            const abs = `${window.location.origin}${url}`;
                            window.open(abs, '_blank');
                          }}
                          className="bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
                        >
                          Full Viewer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Annotations Panel */}
            {!isFullscreen && (
              <div className="bg-gray-50 border-t border-gray-200 p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-900">Annotations ({annotations.length})</h3>
                  {annotations.length > 0 && (
                    <button
                      onClick={() => setAnnotations([])}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {annotations.length > 0 ? (
                    annotations.map((annotation: any) => (
                      <div key={annotation.id} className="bg-white p-2 rounded-md mb-2 text-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <span className="font-medium capitalize">{annotation.type}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {new Date(annotation.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteAnnotation(annotation.id)}
                            className="text-red-500 hover:text-red-700 text-xs ml-2"
                          >
                            ✕
                          </button>
                        </div>
                        {annotation.content && (
                          <p className="text-gray-600 mt-1">{annotation.content}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No annotations yet. Use the tools above to add highlights, text, or drawings.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg">Select a PDF to view and annotate</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFManager;
