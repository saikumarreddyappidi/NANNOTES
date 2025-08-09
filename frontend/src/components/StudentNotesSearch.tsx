import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { searchStaffNotes, saveSearchedNote, clearSearchResults } from '../store/notesSlice';

const StudentNotesSearch: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { searchResults, currentStaffInfo, isLoading, error } = useSelector((state: RootState) => state.notes);
  
  const [staffId, setStaffId] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [expandedNote, setExpandedNote] = useState<number | null>(null);
  const [savingNoteId, setSavingNoteId] = useState<number | null>(null);

  // Clear search results when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      dispatch(clearSearchResults());
    };
  }, [dispatch]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!staffId.trim()) {
      setMessage('Please enter a staff ID');
      setMessageType('error');
      return;
    }

    setMessage('');
    try {
      await dispatch(searchStaffNotes(staffId.trim())).unwrap();
      setMessage(`Found ${searchResults.length} shared note(s) from Staff ID: ${staffId}`);
      setMessageType('success');
    } catch (error: any) {
      setMessage(error.message || 'No notes found for this ID');
      setMessageType('error');
    }
  };

  const handleSaveNote = async (noteId: number) => {
    setSavingNoteId(noteId);
    try {
      await dispatch(saveSearchedNote(noteId.toString())).unwrap();
      setMessage('Note saved to your account successfully!');
      setMessageType('success');
    } catch (error: any) {
      setMessage(error.message || 'Failed to save note');
      setMessageType('error');
    } finally {
      setSavingNoteId(null);
    }
  };

  const toggleNoteExpansion = (noteId: number) => {
    setExpandedNote(expandedNote === noteId ? null : noteId);
  };

  const clearSearch = () => {
    dispatch(clearSearchResults());
    setStaffId('');
    setMessage('');
    setMessageType('');
  };

  // Only show for students
  if (user?.role !== 'student') {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <svg className="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900">Search Teacher Notes</h2>
        </div>
        {searchResults.length > 0 && (
          <button
            onClick={clearSearch}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Clear Results
          </button>
        )}
      </div>
      
      <p className="text-gray-600 mb-4">
        Enter a teacher's ID to search for their shared notes. These results are temporary unless saved.
      </p>

      <form onSubmit={handleSearch} className="space-y-4 mb-6">
        <div>
          <label htmlFor="staffId" className="block text-sm font-medium text-gray-700 mb-1">
            Teacher ID
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="staffId"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              placeholder="Enter teacher ID number"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </form>

      {message && (
        <div className={`mb-4 p-4 rounded-md ${
          messageType === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {currentStaffInfo && searchResults.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="font-semibold text-yellow-900">Temporary Search Results</h3>
          </div>
          <p className="text-yellow-700 text-sm">
            <span className="font-medium">Teacher ID:</span> {currentStaffInfo.name} | 
            <span className="font-medium"> Subject:</span> {currentStaffInfo.subject}
          </p>
          <p className="text-yellow-700 text-sm mt-1">
            These results will disappear when you navigate away unless you save them to your account.
          </p>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Teacher's Shared Notes</h3>
          {searchResults.map((note) => (
            <div key={note._id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-semibold text-gray-900">{note.title}</h4>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    ⚠️ Temporary
                  </span>
                  <button
                    onClick={() => handleSaveNote(parseInt(note._id))}
                    disabled={savingNoteId === parseInt(note._id)}
                    className="bg-green-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {savingNoteId === parseInt(note._id) ? 'Saving...' : 'Save to My Notes'}
                  </button>
                  <button
                    onClick={() => toggleNoteExpansion(parseInt(note._id))}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {expandedNote === parseInt(note._id) ? 'Collapse' : 'View'}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                <span>By: {note.createdByName}</span>
                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
              </div>

              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {note.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {expandedNote === parseInt(note._id) && (
                <div className="mt-4 p-4 bg-white border border-gray-200 rounded-md">
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentNotesSearch;
