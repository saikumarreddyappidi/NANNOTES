import React, { useState } from 'react';

interface Note {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  createdById: string;
}

const SimpleNotesSearch: React.FC = () => {
  const [staffId, setStaffId] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // This function matches exactly the JavaScript pseudocode you provided
  const handleSearch = async () => {
    // Don't do anything if the input is empty
    if (!staffId) {
      return;
    }

    setIsLoading(true);

    try {
      // 3. Call the backend API with the entered Staff ID
      const response = await fetch(`http://localhost:5000/api/notes/${staffId}`);
      const fetchedNotes = await response.json();

      // 5. Display the new results
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press in input field
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Search Teacher's Notes</h2>
      
      {/* HTML Structure matching your pseudocode */}
      <div className="mb-6 flex gap-4">
        {/* Input field for the Staff ID */}
        <input
          id="staff-id-input"
          type="text"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter Staff Registration Number (e.g., STAFF001)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        
        {/* Search button */}
        <button
          id="search-button"
          onClick={handleSearch}
          disabled={isLoading || !staffId}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Searching...' : 'Search Notes'}
        </button>
      </div>

      {/* Empty container to show the results */}
      <div id="notes-container" className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Searching for notes...</p>
          </div>
        ) : notes.length > 0 ? (
          // If notes were found, loop through them and display each one
          notes.map(note => (
            <div key={note._id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3 text-gray-800">{note.title}</h3>
              <div 
                className="prose prose-sm max-w-none text-gray-700 mb-3"
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
              <div className="text-sm text-gray-500">
                Created: {new Date(note.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        ) : staffId && !isLoading ? (
          // If no notes were found, show a message
          <div className="text-center py-8">
            <p className="text-gray-600">No notes found for this Staff ID.</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Enter a staff registration number to search for their notes.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleNotesSearch;
