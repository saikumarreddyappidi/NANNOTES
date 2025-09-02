import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Search, Plus, X, Users, BookOpen } from 'lucide-react';
import api from '../services/api';

interface Staff {
  _id: string;
  registrationNumber: string;
  subject: string;
}

interface ConnectedStaff extends Staff {
  notesCount?: number;
}

const StaffSearch: React.FC = () => {
  const navigate = useNavigate();
  const [searchId, setSearchId] = useState('');
  const [searchResults, setSearchResults] = useState<Staff[]>([]);
  const [connectedStaff, setConnectedStaff] = useState<ConnectedStaff[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    fetchConnectedStaff();
  }, []);

  const fetchConnectedStaff = async () => {
    try {
      setLoading(true);
      const response = await api.get('/staff/connected');
      setConnectedStaff(response.data);
    } catch (error: any) {
      console.error('Error fetching connected staff:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch connected staff');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) {
      toast.error('Please enter a staff ID');
      return;
    }

    try {
      setSearchLoading(true);
      const response = await api.get(`/staff/search/${searchId.trim()}`);
      setSearchResults([response.data]);
      toast.success('Staff found!');
    } catch (error: any) {
      console.error('Error searching staff:', error);
      setSearchResults([]);
      if (error.response?.status === 404) {
        toast.error('Staff not found with this ID');
      } else {
        toast.error('Failed to search staff');
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddStaff = async (staffId: string) => {
    try {
      await api.post('/staff/add-staff', { staffId });
      toast.success('Staff added successfully!');
      setSearchResults([]);
      setSearchId('');
      fetchConnectedStaff();
    } catch (error: any) {
      console.error('Error adding staff:', error);
      if (error.response?.status === 400) {
        toast.error(error.response.data.message || 'Staff already connected');
      } else {
        toast.error('Failed to add staff');
      }
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    try {
      await api.delete(`/staff/remove-staff/${staffId}`);
      toast.success('Staff removed successfully!');
      fetchConnectedStaff();
    } catch (error: any) {
      console.error('Error removing staff:', error);
      toast.error('Failed to remove staff');
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
                Staff Search
              </h1>
              <p className="text-gray-600">
                Search and connect with staff to access their shared notes
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
            Search for Staff
          </h2>
          
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter staff ID (e.g., S12345)"
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
            {searchResults.map((staff) => (
              <div
                key={staff._id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div>
                  <h4 className="font-semibold text-gray-800">
                    {staff.registrationNumber}
                  </h4>
                  <p className="text-gray-600">Subject: {staff.subject}</p>
                </div>
                <button
                  onClick={() => handleAddStaff(staff.registrationNumber)}
                  className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  <Plus className="mr-1" size={16} />
                  Add Staff
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Connected Staff */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Users className="mr-2 text-orange-400" size={20} />
            Connected Staff ({connectedStaff.length})
          </h3>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : connectedStaff.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="mx-auto mb-3 text-gray-300" size={48} />
              <p>No staff connected yet</p>
              <p className="text-sm">Search for staff to access their shared notes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connectedStaff.map((staff) => (
                <div
                  key={staff._id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <div className="bg-orange-100 p-2 rounded-lg mr-3">
                      <BookOpen className="text-orange-600" size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {staff.registrationNumber}
                      </h4>
                      <p className="text-gray-600">Subject: {staff.subject}</p>
                      {staff.notesCount !== undefined && (
                        <p className="text-xs text-gray-500">
                          {staff.notesCount} shared notes available
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
                      onClick={() => handleRemoveStaff(staff.registrationNumber)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                      title="Remove staff"
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

export default StaffSearch;
