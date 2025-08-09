import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';

interface Note {
  _id: number;
  title: string;
  content: string;
  tags: string[];
  createdById: number;
  createdByRole: string;
  createdByName: string;
  shared: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StaffInfo {
  name: string;
  subject: string;
  totalNotes: number;
}

const SharedNotesSearch: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [teacherId, setTeacherId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState<Note[]>([]);
  const [teacherInfo, setTeacherInfo] = useState<StaffInfo | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [expandedNote, setExpandedNote] = useState<number | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teacherId.trim()) {
      setMessage('Please enter a teacher ID');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setTeacherNotes([]);
    setTeacherInfo(null);

    try {
      const response = await api.get(`/notes/search/${teacherId.trim()}`);
      
      setTeacherNotes(response.data.notes);
      setTeacherInfo(response.data.teacherInfo);
      setMessage(`Found ${response.data.notes.length} note(s) from Teacher ID: ${response.data.teacherInfo.name}`);
      setMessageType('success');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'No notes found for this ID';
      setMessage(errorMessage);
      setMessageType('error');
      setTeacherNotes([]);
      setTeacherInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNoteExpansion = (noteId: number) => {
    setExpandedNote(expandedNote === noteId ? null : noteId);
  };

  // Only show for students
  if (user?.role !== 'student') {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center mb-4">
        <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h2 className="text-xl font-semibold text-gray-900">Search Teacher Notes</h2>
      </div>
      
      <p className="text-gray-600 mb-4">
        Enter your teacher's unique ID number to view their notes.
      </p>

      <form onSubmit={handleSearch} className="space-y-4 mb-6">
        <div>
          <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 mb-1">
            Teacher ID
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="teacherId"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              placeholder="Enter teacher ID number"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 text-white px-6 py-2 rounded-md font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {teacherInfo && teacherNotes.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-semibold text-blue-900">Teacher Information</h3>
          <p className="text-blue-700">
            <span className="font-medium">Teacher ID:</span> {teacherInfo.name} | 
            <span className="font-medium"> Subject:</span> {teacherInfo.subject} |
            <span className="font-medium"> Total Notes:</span> {teacherInfo.totalNotes}
          </p>
        </div>
      )}

      {teacherNotes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Teacher Notes</h3>
          {teacherNotes.map((note) => (
            <div key={note._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-semibold text-gray-900">{note.title}</h4>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Teacher Note
                  </span>
                  <button
                    onClick={() => toggleNoteExpansion(note._id)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {expandedNote === note._id ? 'Collapse' : 'View'}
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

              {expandedNote === note._id && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
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

export default SharedNotesSearch;
