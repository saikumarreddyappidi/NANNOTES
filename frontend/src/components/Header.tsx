import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { RootState } from '../store';

const Header: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NANNOTES</h1>
          <p className="text-sm text-gray-600">
            Welcome back, {user?.registrationNumber} ({user?.role})
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {user?.role === 'staff' && user?.teacherCode && (
            <div className="bg-primary-50 px-3 py-1 rounded-full">
              <span className="text-xs font-medium text-primary-700">
                Teacher Code: {user.teacherCode}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
