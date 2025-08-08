import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { NotesState } from '../types';
import api from '../services/api';

const initialState: NotesState = {
  notes: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedTags: [],
};

// Async thunks
export const fetchNotes = createAsyncThunk(
  'notes/fetchNotes',
  async () => {
    const response = await api.get('/notes');
    return response.data.notes || response.data;
  }
);

export const createNote = createAsyncThunk(
  'notes/createNote',
  async (noteData: { title: string; content: string; tags: string[]; isShared?: boolean }) => {
    const response = await api.post('/notes', noteData);
    return response.data.note || response.data;
  }
);

export const updateNote = createAsyncThunk(
  'notes/updateNote',
  async ({ id, ...noteData }: { id: string; title: string; content: string; tags: string[]; isShared?: boolean }) => {
    const response = await api.put(`/notes/${id}`, noteData);
    return response.data.note || response.data;
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
      });
  },
});

export const { setSearchQuery, setSelectedTags, clearError } = notesSlice.actions;
export default notesSlice.reducer;
