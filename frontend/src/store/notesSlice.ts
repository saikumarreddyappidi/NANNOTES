import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { NotesState } from '../types';
import api from '../services/api';

const initialState: NotesState = {
  notes: [],
  searchResults: [], // Temporary search results for staff notes
  currentStaffInfo: null, // Info about currently searched staff
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedTags: [],
};

// Async thunks
export const fetchNotes = createAsyncThunk(
  'notes/fetchNotes',
  async () => {
    const response = await api.get('/notes/my');
    return response.data.notes || response.data;
  }
);

export const createNote = createAsyncThunk(
  'notes/createNote',
  async (noteData: { title: string; content: string; tags: string[]; shared?: boolean }) => {
    const response = await api.post('/notes', noteData);
    return response.data.note || response.data;
  }
);

export const updateNote = createAsyncThunk(
  'notes/updateNote',
  async ({ id, ...noteData }: { id: string; title: string; content: string; tags: string[]; shared?: boolean }) => {
    const response = await api.put(`/notes/${id}`, noteData);
    return response.data.note || response.data;
  }
);

export const searchStaffNotes = createAsyncThunk(
  'notes/searchStaffNotes',
  async (staffId: string) => {
    const response = await api.get(`/notes/search/${staffId}`);
    return response.data;
  }
);

export const saveSearchedNote = createAsyncThunk(
  'notes/saveSearchedNote',
  async (noteId: string) => {
    const response = await api.post(`/notes/save/${noteId}`);
    return response.data.note;
  }
);

export const deleteNote = createAsyncThunk(
  'notes/deleteNote',
  async (id: string) => {
    await api.delete(`/notes/${id}`);
    return id;
  }
);

export const searchNotes = createAsyncThunk(
  'notes/searchNotes',
  async ({ query, tags }: { query: string; tags: string[] }) => {
    const response = await api.get('/notes/search', {
      params: { q: query, tags: tags.join(',') }
    });
    return response.data;
  }
);

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setSelectedTags: (state, action) => {
      state.selectedTags = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.currentStaffInfo = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch notes
      .addCase(fetchNotes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notes = action.payload;
      })
      .addCase(fetchNotes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch notes';
        state.notes = []; // Ensure notes is always an array
      })
      // Create note
      .addCase(createNote.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notes.unshift(action.payload);
      })
      .addCase(createNote.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create note';
      })
      // Update note
      .addCase(updateNote.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateNote.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.notes.findIndex(note => note._id === action.payload._id);
        if (index !== -1) {
          state.notes[index] = action.payload;
        }
      })
      .addCase(updateNote.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update note';
      })
      // Delete note
      .addCase(deleteNote.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notes = state.notes.filter(note => note._id !== action.payload);
      })
      .addCase(deleteNote.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to delete note';
      })
      // Search notes
      .addCase(searchNotes.fulfilled, (state, action) => {
        state.notes = action.payload;
      })
      .addCase(searchNotes.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to search notes';
        state.notes = []; // Ensure notes is always an array
      })
      // Search staff notes
      .addCase(searchStaffNotes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchStaffNotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.searchResults = action.payload.notes;
        state.currentStaffInfo = action.payload.teacherInfo;
      })
      .addCase(searchStaffNotes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to search notes';
        state.searchResults = [];
        state.currentStaffInfo = null;
      })
      // Save searched note
      .addCase(saveSearchedNote.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveSearchedNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notes.unshift(action.payload); // Add to user's permanent notes at the beginning
      })
      .addCase(saveSearchedNote.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to save note';
      });
  },
});

export const { setSearchQuery, setSelectedTags, clearError, clearSearchResults } = notesSlice.actions;
export default notesSlice.reducer;
