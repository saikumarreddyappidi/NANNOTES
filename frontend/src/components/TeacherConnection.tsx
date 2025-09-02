import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';

const TeacherConnection: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [staffId, setStaffId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!staffId.trim()) {
      setMessage('Please enter a staff ID');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await api.post('/auth/connect-staff', {
        staffId: staffId.trim()
      });

      setMessage(`Successfully connected to ${response.data.staffName} (${response.data.staffSubject})`);
      setMessageType('success');
      setStaffId('');
      
      // Optionally refresh the page or update user state
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to connect to staff';
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Only show for students
  if (user?.role !== 'student') {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center mb-4">
        <svg className="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h2 className="text-xl font-semibold text-gray-900">Connect to Staff</h2>
      </div>
      
      <p className="text-gray-600 mb-4">
        Enter your teacher's ID to access their shared notes, whiteboards, and PDF files.
      </p>

      <form onSubmit={handleConnect} className="space-y-4">
        <div>
          <label htmlFor="staffId" className="block text-sm font-medium text-gray-700 mb-1">
            Staff ID
          </label>
          <input
            type="text"
            id="staffId"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            placeholder="Enter staff ID (e.g., S12345)"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Connecting...' : 'Connect to Staff'}
        </button>
      </form>

      {message && (
        <div className={`mt-4 p-4 rounded-md ${
          messageType === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {user?.connectedStaff && user.connectedStaff.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Connected Staff</h3>
          <div className="space-y-2">
            {user.connectedStaff.map((id: string, index: number) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-md">
                <span className="font-mono text-sm text-gray-700">{id}</span>
                <span className="text-xs text-green-600 font-medium">Connected</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherConnection;
