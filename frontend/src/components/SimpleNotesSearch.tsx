import React, { useState } from 'react';
import api from '../services/api';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { saveSearchedNote } from '../store/notesSlice';

interface Note {
  _id: string | number;
  title: string;
  content: string;
  createdAt: string;
  createdByName: string;
  createdBySubject?: string;
}

interface FileItem {
  id: string;
  title: string;
  filename: string;
  fileUrl?: string;
  createdAt: string;
  ownerName: string;
  ownerSubject?: string;
}

interface DrawingItem {
  id: string;
  title: string;
  imageData: string;
  createdAt: string;
  ownerName: string;
  ownerSubject?: string;
}

const SimpleNotesSearch: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [staffId, setStaffId] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [teacherSubject, setTeacherSubject] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveToMyNotes = async (noteId: string | number) => {
    try {
      await dispatch(saveSearchedNote(String(noteId))).unwrap();
      alert('Saved to your notes. You can edit it in Notepad.');
    } catch (e: any) {
      console.error('Save to my notes failed:', e);
      alert(e?.message || e?.response?.data?.message || 'Failed to save note');
    }
  };

  const saveToMyFiles = async (fileId: string) => {
    try {
      await api.post(`/files/save/${encodeURIComponent(fileId)}`);
      alert('Saved to your Files. Open it in PDF Manager.');
    } catch (e: any) {
      console.error('Save file failed:', e);
      alert(e?.response?.data?.message || 'Failed to save file');
    }
  };

  const saveToMyDrawings = async (drawingId: string) => {
    try {
      await api.post(`/whiteboards/save/${encodeURIComponent(drawingId)}`);
      alert('Saved to your Drawings. Open it in Whiteboard.');
    } catch (e: any) {
      console.error('Save drawing failed:', e);
      alert(e?.response?.data?.message || 'Failed to save drawing');
    }
  };

  const handleSearch = async () => {
    if (!staffId.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const [notesRes, filesRes, drawingsRes] = await Promise.all([
        api.get(`/notes/search/${encodeURIComponent(staffId.trim())}`),
        api.get(`/files/search/${encodeURIComponent(staffId.trim())}`),
        api.get(`/whiteboards/search/${encodeURIComponent(staffId.trim())}`)
      ]);

      setNotes(notesRes.data?.notes || []);
      setFiles(filesRes.data?.files || []);
      setDrawings(drawingsRes.data?.drawings || []);
      setTeacherSubject(
        notesRes.data?.teacherInfo?.subject ||
        filesRes.data?.teacherInfo?.subject ||
        drawingsRes.data?.teacherInfo?.subject
      );
    } catch (e: any) {
      console.error('Search error:', e);
      setError(e?.response?.data?.message || 'Search failed');
      setNotes([]);
      setFiles([]);
      setDrawings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const hasAny = notes.length + files.length + drawings.length > 0;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Search Staff's Shared Content</h2>

      <div className="mb-6 flex gap-4">
        <input
          id="staff-id-input"
          type="text"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter Staff ID (registration number)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          id="search-button"
          onClick={handleSearch}
          disabled={isLoading || !staffId}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {!isLoading && staffId && !hasAny && (
        <div className="text-center py-8 text-gray-600">No shared content found for this Staff ID.</div>
      )}

      {hasAny && (
        <div className="space-y-8">
          {/* Notes */}
          {notes.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Shared Notes {teacherSubject ? `(Subject: ${teacherSubject})` : ''}</h3>
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={String(note._id)} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900">{note.title}</h4>
                        <div className="text-xs text-gray-500 mt-1">
                          By {note.createdByName} • {note.createdBySubject || teacherSubject || 'General'} • {new Date(note.createdAt).toLocaleDateString()} {new Date(note.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <button
                        onClick={() => saveToMyNotes(note._id)}
                        className="ml-3 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        title="Copy to your notes for editing"
                      >
                        Save to My Notes
                      </button>
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-700 mt-3" dangerouslySetInnerHTML={{ __html: note.content }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {files.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Shared Files (PDF / PowerPoint) {teacherSubject ? `(Subject: ${teacherSubject})` : ''}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {files.map((f) => (
                  <div key={f.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-gray-900">{f.title}</h4>
                      <button
                        onClick={() => saveToMyFiles(f.id)}
                        className="ml-3 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        title="Copy to your files"
                      >Save to My Files</button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      By {f.ownerName} • {f.ownerSubject || teacherSubject || 'General'} • {new Date(f.createdAt).toLocaleDateString()} {new Date(f.createdAt).toLocaleTimeString()}
                    </div>
                    <div className="mt-2 text-sm text-gray-600">{f.filename}</div>
                    {f.fileUrl && (
                      <a className="mt-3 inline-block text-blue-600 hover:underline" href={f.fileUrl} target="_blank" rel="noreferrer">Open</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drawings */}
          {drawings.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Shared Drawings {teacherSubject ? `(Subject: ${teacherSubject})` : ''}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {drawings.map((d) => (
                  <div key={d.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-gray-900">{d.title}</h4>
                      <button
                        onClick={() => saveToMyDrawings(d.id)}
                        className="ml-3 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        title="Copy to your drawings"
                      >Save to My Drawings</button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      By {d.ownerName} • {d.ownerSubject || teacherSubject || 'General'} • {new Date(d.createdAt).toLocaleDateString()} {new Date(d.createdAt).toLocaleTimeString()}
                    </div>
                    <img src={d.imageData} alt={d.title} className="mt-3 w-full h-32 object-cover rounded" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleNotesSearch;
