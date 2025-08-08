import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../store/authSlice';
import { RootState, AppDispatch } from '../store';

const Login: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [formData, setFormData] = useState({
    registrationNumber: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(login(formData)).unwrap();
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" 
         style={{
           backgroundColor: '#fdfcf8',
           backgroundImage: `
             linear-gradient(rgba(200, 216, 236, 0.3) 1px, transparent 1px)
           `,
           backgroundSize: '100% 24px'
         }}>

      <div className="w-96 h-auto min-h-[500px] max-h-[550px] bg-[#fdfcf8] shadow-lg rounded-lg border-l-4 border-l-red-300 relative">
        {/* Notebook Binding Effect */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-red-100 to-transparent opacity-50"></div>
        <div className="absolute left-6 top-4 bottom-4 w-px bg-red-200"></div>
        
        {/* Spiral Binding Holes */}
        <div className="absolute left-2 top-12 w-2 h-2 bg-white rounded-full border border-gray-300"></div>
        <div className="absolute left-2 top-20 w-2 h-2 bg-white rounded-full border border-gray-300"></div>
        <div className="absolute left-2 top-28 w-2 h-2 bg-white rounded-full border border-gray-300"></div>
        <div className="absolute left-2 bottom-28 w-2 h-2 bg-white rounded-full border border-gray-300"></div>
        <div className="absolute left-2 bottom-20 w-2 h-2 bg-white rounded-full border border-gray-300"></div>
        <div className="absolute left-2 bottom-12 w-2 h-2 bg-white rounded-full border border-gray-300"></div>

        {/* Header Section */}
        <div className="text-center pt-8 pb-6 px-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            NANNOTES
          </h2>
          <p className="text-sm text-gray-600">
            Educational Productivity Platform
          </p>
        </div>

        {/* Form Section */}
        <div className="flex-1 px-12 pb-8">
          <div className="h-full flex flex-col justify-between">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700 mb-3">
                  Registration Number / Teacher Code
                </label>
                <input
                  id="registrationNumber"
                  name="registrationNumber"
                  type="text"
                  required
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  className="block w-full px-2 py-3 text-base bg-transparent border-0 border-b-2 border-blue-300 focus:outline-none focus:border-blue-500 transition duration-200"
                  placeholder="Enter your registration number or teacher code"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-3">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full px-2 py-3 text-base bg-transparent border-0 border-b-2 border-blue-300 focus:outline-none focus:border-blue-500 transition duration-200"
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                  <span className="text-red-600 text-sm">{error}</span>
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-6 text-white font-medium rounded-lg shadow-lg transition duration-200 hover:shadow-xl"
                  style={{ 
                    backgroundColor: '#3b82f6',
                    fontSize: '16px'
                  }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>

              <div className="text-center pt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-[#fdfcf8] text-gray-500">
                      New to NANNOTES?
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <Link 
                      to="/register" 
                      className="font-medium text-blue-600 hover:text-blue-500 transition duration-200 hover:underline"
                    >
                      Register here
                    </Link>
                  </span>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
