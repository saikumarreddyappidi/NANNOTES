import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchNotes } from '../store/notesSlice';
import api from '../services/api';

const DashboardHome: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { notes } = useSelector((state: RootState) => state.notes);
  const [teacherCode, setTeacherCode] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [selectedNote, setSelectedNote] = useState<any>(null);

  const handleNoteClick = (note: any) => {
    setSelectedNote(note);
  };

  const closeNoteView = () => {
    setSelectedNote(null);
  };

  const handleTeacherCodeSearch = async () => {
    if (!teacherCode.trim()) {
      setSearchMessage('Please enter a teacher code');
      return;
    }

    try {
      setSearchMessage('Connecting to teacher...');
      
      const response = await api.post('/auth/connect-teacher', {
        teacherCode: teacherCode.trim()
      });
      
      setSearchMessage(`Successfully connected to ${response.data.teacherName}! Refreshing notes...`);
      
      setTimeout(async () => {
        await dispatch(fetchNotes());
        setSearchMessage(`Connected to ${response.data.teacherName} (${response.data.teacherSubject}). You can now see their shared notes.`);
        setTeacherCode('');
      }, 1000);
      
    } catch (error: any) {
      console.error('Teacher code search failed:', error);
      const errorMessage = error.response?.data?.error || 'Teacher code not found. Please check and try again.';
      setSearchMessage(errorMessage);
    }
  };

  const quickStats = [
    {
      title: 'Total Notes',
      value: notes.length,
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      title: 'Shared Notes',
      value: notes.filter(note => note.isShared).length,
      icon: (
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
    },
    {
      title: 'Personal Notes',
      value: notes.filter(note => !note.isShared).length,
      icon: (
        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  const recentNotes = notes.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome to NANNOTES, {user?.registrationNumber}!
            </h1>
            <p className="text-gray-600 mt-2">
              Your educational productivity platform for notes, drawings, and PDFs
            </p>
          </div>
          <div className="bg-primary-50 p-4 rounded-full">
            <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Role</p>
            <p className="font-medium text-gray-900 capitalize">{user?.role}</p>
          </div>
          {user?.role === 'student' && (
            <>
              <div>
                <p className="text-sm text-gray-500">Year</p>
                <p className="font-medium text-gray-900">{user?.year}st Year</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Semester</p>
                <p className="font-medium text-gray-900">{user?.semester}st Semester</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Course</p>
                <p className="font-medium text-gray-900">{user?.course}</p>
              </div>
            </>
          )}
          {user?.role === 'staff' && (
            <>
              <div>
                <p className="text-sm text-gray-500">Subject</p>
                <p className="font-medium text-gray-900">{user?.subject}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Teacher Code</p>
                <p className="font-medium text-primary-600">{user?.teacherCode}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Teacher Code Section */}
      {user?.role === 'staff' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Share Notes with Students</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-6 6c-3 0-5.5-1-5.5-1l-4.5-4.5s1-2.5 1-5.5a6 6 0 016-6z" />
              </svg>
              <h3 className="text-lg font-medium text-blue-900">Your Teacher Code</h3>
            </div>
            <div className="bg-white border border-blue-300 rounded-md p-3 mb-3">
              <code className="text-2xl font-bold text-blue-600">{user?.teacherCode}</code>
            </div>
            <p className="text-blue-700 text-sm">
              Share this code with students so they can access your shared notes. When you create notes and mark them as "shared", 
              students who have entered your teacher code will see them in their dashboard.
            </p>
          </div>
        </div>
      )}

      {user?.role === 'student' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Access Teacher Notes</h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-lg font-medium text-green-900">Enter Teacher Code</h3>
            </div>
            <div className="flex space-x-3 mb-3">
              <input
                type="text"
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value.toUpperCase())}
                placeholder="Enter teacher code (e.g., TC12345678)"
                className="flex-1 px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                maxLength={10}
              />
              <button
                onClick={handleTeacherCodeSearch}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Connect
              </button>
            </div>
            {searchMessage && (
              <div className={`text-sm p-2 rounded ${searchMessage.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {searchMessage}
              </div>
            )}
            <p className="text-green-700 text-sm">
              Enter your teacher's code to access their shared notes and study materials.
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {stat.icon}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Notes */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Notes</h2>
        </div>
        <div className="p-6">
          {recentNotes.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-gray-500 mt-2">No notes yet. Start by creating your first note!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentNotes.map((note) => (
                <div 
                  key={note._id} 
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleNoteClick(note)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 hover:text-blue-600">{note.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        By: {note.authorName} | Created: {new Date(note.createdAt).toLocaleDateString()} {new Date(note.createdAt).toLocaleTimeString()}
                        {note.updatedAt && note.updatedAt !== note.createdAt && (
                          <span> | Updated: {new Date(note.updatedAt).toLocaleDateString()} {new Date(note.updatedAt).toLocaleTimeString()}</span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.tags?.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {note.isShared && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          Shared
                        </span>
                      )}
                      <span className="text-xs text-gray-400">Click to view</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <div className="bg-blue-50 p-4 rounded-full w-16 h-16 mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Create Note</h3>
            <p className="text-gray-600 text-sm mb-4">Start writing your thoughts and ideas</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
              New Note
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <div className="bg-green-50 p-4 rounded-full w-16 h-16 mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Draw & Sketch</h3>
            <p className="text-gray-600 text-sm mb-4">Express ideas with drawings and diagrams</p>
            <button className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700">
              Open Whiteboard
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <div className="bg-purple-50 p-4 rounded-full w-16 h-16 mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload PDF</h3>
            <p className="text-gray-600 text-sm mb-4">Manage and annotate PDF documents</p>
            <button className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700">
              Upload PDF
            </button>
          </div>
        </div>
      </div>

      {/* Note View Modal */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedNote.title}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  By: {selectedNote.authorName} | 
                  Created: {new Date(selectedNote.createdAt).toLocaleDateString()} {new Date(selectedNote.createdAt).toLocaleTimeString()}
                  {selectedNote.updatedAt && selectedNote.updatedAt !== selectedNote.createdAt && (
                    <span> | Last Updated: {new Date(selectedNote.updatedAt).toLocaleDateString()} {new Date(selectedNote.updatedAt).toLocaleTimeString()}</span>
                  )}
                </p>
              </div>
              <button
                onClick={closeNoteView}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-4">
                {selectedNote.tags && selectedNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedNote.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                {selectedNote.isShared && (
                  <span className="inline-block bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full mb-4">
                    📤 Shared Note
                  </span>
                )}
              </div>
              
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedNote.content }}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={closeNoteView}
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;
