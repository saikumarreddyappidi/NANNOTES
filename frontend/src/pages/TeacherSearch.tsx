import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Search, Plus, X, Users, BookOpen } from 'lucide-react';
import api from '../services/api';

interface Teacher {
  _id: string;
  firstName: string;
  lastName: string;
  teacherCode: string;
  subject: string;
}

interface ConnectedTeacher extends Teacher {
  notesCount?: number;
}

const TeacherSearch: React.FC = () => {
  const navigate = useNavigate();
  const [searchCode, setSearchCode] = useState('');
  const [searchResults, setSearchResults] = useState<Teacher[]>([]);
  const [connectedTeachers, setConnectedTeachers] = useState<ConnectedTeacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    fetchConnectedTeachers();
  }, []);

  const fetchConnectedTeachers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/teachers/connected');
      setConnectedTeachers(response.data);
    } catch (error: any) {
      console.error('Error fetching connected teachers:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch connected teachers');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) {
      toast.error('Please enter a teacher code');
      return;
    }

    try {
      setSearchLoading(true);
      const response = await api.get(`/teachers/search/${searchCode.trim()}`);
      setSearchResults([response.data]);
      toast.success('Teacher found!');
    } catch (error: any) {
      console.error('Error searching teacher:', error);
      setSearchResults([]);
      if (error.response?.status === 404) {
        toast.error('Teacher not found with this code');
      } else {
        toast.error('Failed to search teacher');
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddTeacher = async (teacherCode: string) => {
    try {
      await api.post('/teachers/add-teacher', { teacherCode });
      toast.success('Teacher added successfully!');
      setSearchResults([]);
      setSearchCode('');
      fetchConnectedTeachers();
    } catch (error: any) {
      console.error('Error adding teacher:', error);
      if (error.response?.status === 400) {
        toast.error(error.response.data.message || 'Teacher already connected');
      } else {
        toast.error('Failed to add teacher');
      }
    }
  };

  const handleRemoveTeacher = async (teacherCode: string) => {
    try {
      await api.delete(`/teachers/remove-teacher/${teacherCode}`);
      toast.success('Teacher removed successfully!');
      fetchConnectedTeachers();
    } catch (error: any) {
      console.error('Error removing teacher:', error);
      toast.error('Failed to remove teacher');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-l-4 border-orange-400">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Teacher Search
              </h1>
              <p className="text-gray-600">
                Search and connect with teachers to access their shared notes
              </p>
            </div>
            <div className="text-orange-400">
              <Search size={48} />
            </div>
          </div>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Search className="mr-2 text-orange-400" size={20} />
            Search for Teachers
          </h2>
          
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Enter teacher code (e.g., TCH001)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                disabled={searchLoading}
              />
            </div>
            <button
              type="submit"
              disabled={searchLoading}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {searchLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : (
                <Search className="mr-2" size={18} />
              )}
              Search
            </button>
          </form>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Search Results</h3>
            {searchResults.map((teacher) => (
              <div
                key={teacher._id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div>
                  <h4 className="font-semibold text-gray-800">
                    {teacher.firstName} {teacher.lastName}
                  </h4>
                  <p className="text-gray-600">Subject: {teacher.subject}</p>
                  <p className="text-sm text-orange-600">Code: {teacher.teacherCode}</p>
                </div>
                <button
                  onClick={() => handleAddTeacher(teacher.teacherCode)}
                  className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  <Plus className="mr-1" size={16} />
                  Add Teacher
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Connected Teachers */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Users className="mr-2 text-orange-400" size={20} />
            Connected Teachers ({connectedTeachers.length})
          </h3>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : connectedTeachers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="mx-auto mb-3 text-gray-300" size={48} />
              <p>No teachers connected yet</p>
              <p className="text-sm">Search for teachers to access their shared notes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connectedTeachers.map((teacher) => (
                <div
                  key={teacher._id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <div className="bg-orange-100 p-2 rounded-lg mr-3">
                      <BookOpen className="text-orange-600" size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {teacher.firstName} {teacher.lastName}
                      </h4>
                      <p className="text-gray-600">Subject: {teacher.subject}</p>
                      <p className="text-sm text-orange-600">Code: {teacher.teacherCode}</p>
                      {teacher.notesCount !== undefined && (
                        <p className="text-xs text-gray-500">
                          {teacher.notesCount} shared notes available
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigate('/notes')}
                      className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                    >
                      View Notes
                    </button>
                    <button
                      onClick={() => handleRemoveTeacher(teacher.teacherCode)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                      title="Remove teacher"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherSearch;
