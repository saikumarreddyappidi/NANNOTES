import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { fetchNotes, createNote, updateNote, deleteNote, searchNotes } from '../store/notesSlice';
import { RootState, AppDispatch } from '../store';

const Notepad: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { notes, isLoading } = useSelector((state: RootState) => state.notes);
  const { user } = useSelector((state: RootState) => state.auth);

  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    dispatch(fetchNotes());
  }, [dispatch]);

  const handleCreateNote = () => {
    setSelectedNote(null);
    setIsEditing(true);
    setTitle('');
    setContent('');
    setTags([]);
    setIsShared(false);
  };

  const handleEditNote = (note: any) => {
    setSelectedNote(note);
    setIsEditing(true);
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags || []);
    setIsShared(note.shared || false);
  };

  const handleSaveNote = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please enter both title and content');
      return;
    }

    const noteData = {
      title: title.trim(),
      content,
      tags,
      shared: user?.role === 'staff' ? isShared : false,
    };

    try {
      if (selectedNote) {
        await dispatch(updateNote({ id: selectedNote._id, ...noteData })).unwrap();
        alert('Note updated successfully!');
      } else {
        await dispatch(createNote(noteData)).unwrap();
        alert('Note created successfully!');
      }
      
      // Reset form and close editor
      setIsEditing(false);
      setSelectedNote(null);
      setTitle('');
      setContent('');
      setTags([]);
      setIsShared(false);
      
      // Refresh notes list
      await dispatch(fetchNotes()).unwrap();
    } catch (error: any) {
      console.error('Failed to save note:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to save note. Please try again.';
      alert(errorMessage);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await dispatch(deleteNote(noteId)).unwrap();
        if (selectedNote?._id === noteId) {
          setSelectedNote(null);
          setIsEditing(false);
        }
        alert('Note deleted successfully!');
      } catch (error: any) {
        console.error('Failed to delete note:', error);
        const errorMessage = error?.message || error?.toString() || 'Failed to delete note. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSearch = () => {
    if (searchInput.trim()) {
      dispatch(searchNotes({ query: searchInput, tags: [] }));
    } else {
      dispatch(fetchNotes());
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['clean'],
    ],
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`h-full flex ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {/* Notes List */}
      <div className={`${isFullscreen ? 'hidden' : 'w-1/3'} bg-white border-r border-gray-200 flex flex-col`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-2 mb-4">
            <input
              type="text"
              placeholder="Search notes..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <button
              onClick={handleSearch}
              className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
            >
              Search
            </button>
          </div>
          <button
            onClick={handleCreateNote}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
          >
            + New Note
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading notes...</div>
          ) : !Array.isArray(notes) || notes.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No notes found</div>
          ) : (
            notes.map((note) => (
              <div
                key={note._id}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedNote?._id === note._id ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedNote(note)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditNote(note);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note._id);
                      }}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <div dangerouslySetInnerHTML={{ __html: note.content.substring(0, 100) + '...' }} />
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {note.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>By: {note.createdByName}</span>
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
                {note.shared && (
                  <div className="text-xs text-green-600 font-medium">
                    Shared Note
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Note Editor */}
      <div className="flex-1 bg-white flex flex-col">
        {isEditing ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">
                  {selectedNote ? 'Edit Note' : 'Create New Note'}
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={toggleFullscreen}
                    className="bg-purple-500 text-white px-3 py-1 rounded-md text-sm hover:bg-purple-600"
                  >
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                  >
                    Save
                  </button>
                </div>
              </div>

              <input
                type="text"
                placeholder="Note title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4"
              />

              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  />
                  <button
                    onClick={handleAddTag}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full flex items-center space-x-1"
                  >
                    <span>#{tag}</span>
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {user?.role === 'staff' && (
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    id="isShared"
                    checked={isShared}
                    onChange={(e) => setIsShared(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="isShared" className="text-sm text-gray-700">
                    Share with students (students can search by your registration number)
                  </label>
                </div>
              )}
            </div>

            <div className={`flex-1 p-4 ${isFullscreen ? 'h-screen overflow-hidden' : ''}`}>
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={quillModules}
                style={{ 
                  height: isFullscreen ? 'calc(100vh - 300px)' : '400px',
                  overflow: 'hidden'
                }}
              />
            </div>
          </div>
        ) : selectedNote ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedNote.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    By: {selectedNote.authorName} | {new Date(selectedNote.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={toggleFullscreen}
                    className="bg-purple-500 text-white px-3 py-1 rounded-md text-sm hover:bg-purple-600"
                  >
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </button>
                  <button
                    onClick={() => handleEditNote(selectedNote)}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                  >
                    Edit
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-4">
                {selectedNote.tags?.map((tag: string) => (
                  <span
                    key={tag}
                    className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
            <div className={`flex-1 p-4 overflow-y-auto ${isFullscreen ? 'h-screen' : ''}`}>
              <div
                className="prose max-w-none"
                style={{
                  height: isFullscreen ? 'calc(100vh - 200px)' : 'auto',
                  overflow: isFullscreen ? 'auto' : 'visible'
                }}
                dangerouslySetInnerHTML={{ __html: selectedNote.content }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-lg">Select a note to view or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notepad;
