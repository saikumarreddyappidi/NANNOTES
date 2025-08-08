import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';

const Whiteboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushRadius, setBrushRadius] = useState(5);
  const [title, setTitle] = useState('');
  const [savedDrawings, setSavedDrawings] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isShared, setIsShared] = useState(false);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'
  ];

  // Load saved drawings
  useEffect(() => {
    loadSavedDrawings();
  }, []);

  const loadSavedDrawings = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/whiteboards');
      setSavedDrawings(response.data);
    } catch (error) {
      console.error('Error loading saved drawings:', error);
      setSavedDrawings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = brushRadius;
        ctx.strokeStyle = brushColor;
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title for your drawing');
      return;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      try {
        setIsLoading(true);
        const dataUrl = canvas.toDataURL('image/png');
        
        const response = await api.post('/whiteboards', {
          title: title.trim(),
          imageData: dataUrl,
          authorName: user?.registrationNumber,
          isShared: user?.role === 'staff' ? isShared : false
        });

        setSavedDrawings(prev => [response.data, ...prev]);
        setTitle('');
        setIsShared(false);
        alert('Drawing saved successfully!');
      } catch (error) {
        console.error('Error saving drawing:', error);
        alert('Failed to save drawing. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLoadDrawing = (drawing: any) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = drawing.imageData;
      }
    }
  };

  const handleDeleteDrawing = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this drawing?')) {
      try {
        setIsLoading(true);
        await api.delete(`/whiteboards/${id}`);
        setSavedDrawings(prev => prev.filter(drawing => drawing.id !== id));
        alert('Drawing deleted successfully!');
      } catch (error) {
        console.error('Error deleting drawing:', error);
        alert('Failed to delete drawing. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`h-full flex ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {/* Drawings List */}
      <div className={`${isFullscreen ? 'hidden' : 'w-1/4'} bg-white border-r border-gray-200 flex flex-col`}>
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Saved Drawings</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading && savedDrawings.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Loading drawings...</div>
          ) : savedDrawings.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No saved drawings</div>
          ) : (
            savedDrawings.map((drawing) => (
              <div
                key={drawing.id}
                className="p-4 border-b border-gray-100 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 truncate">{drawing.title}</h4>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleLoadDrawing(drawing)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDeleteDrawing(drawing.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <img
                  src={drawing.imageData || drawing.imageUrl}
                  alt={drawing.title}
                  className="w-full h-20 object-cover rounded-md bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(drawing.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Drawing Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-medium text-gray-900">Whiteboard</h2>
              
              {/* Color Palette */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Color:</span>
                <div className="flex space-x-1">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setBrushColor(color)}
                      className={`w-6 h-6 rounded-full border-2 ${
                        brushColor === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Brush Size */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Size:</span>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushRadius}
                  onChange={(e) => setBrushRadius(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-gray-600 w-6">{brushRadius}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleFullscreen}
                className="bg-purple-500 text-white px-3 py-1 rounded-md text-sm hover:bg-purple-600"
              >
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </button>
              <button
                onClick={handleClear}
                className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Save Section */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Enter drawing title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Drawing'}
              </button>
            </div>
            
            {user?.role === 'staff' && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="shareDrawing"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="shareDrawing" className="text-sm text-gray-700">
                  Share with students (using teacher code: {user.teacherCode})
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Canvas Area */}
        <div className={`flex-1 bg-gray-50 p-4 ${isFullscreen ? 'p-2' : ''}`}>
          <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={isFullscreen ? window.innerWidth - 20 : 800}
              height={isFullscreen ? window.innerHeight - 200 : 600}
              className="cursor-crosshair w-full h-full"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
