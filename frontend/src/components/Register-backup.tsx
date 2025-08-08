import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../store/authSlice';
import { RootState, AppDispatch } from '../store';

const Register: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [formData, setFormData] = useState({
    registrationNumber: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'student' | 'staff',
    year: '',
    semester: '',
    course: '',
    teacherCode: '',
    subject: '',
  });

  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('One number');
    if (!/[!@#$%^&*]/.test(password)) errors.push('One special character');
    return errors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'password') {
      setPasswordErrors(validatePassword(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (passwordErrors.length > 0) {
      alert('Please fix password requirements');
      return;
    }

    // Validate role-specific required fields
    if (formData.role === 'staff' && !formData.teacherCode.trim()) {
      alert('Teacher code is required for staff registration');
      return;
    }

    if (formData.role === 'student' && !formData.registrationNumber.trim()) {
      alert('Registration number is required for student registration');
      return;
    }

    try {
      await dispatch(register(formData)).unwrap();
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration failed:', error);
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

      <div className="w-full max-w-lg mx-auto bg-[#fdfcf8] shadow-lg rounded-lg border-l-4 border-l-red-300 relative" 
           style={{ minHeight: '600px', maxHeight: 'auto' }}>
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
        <div className="text-center pt-6 pb-4 px-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            NANNOTES
          </h2>
          <p className="text-sm text-gray-600">
            Create New Account
          </p>
        </div>

        {/* Form Section */}
        <div className="px-8 pb-6">
          <div className="space-y-4">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  I am a
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="block w-full px-2 py-2 text-base bg-transparent border-0 border-b-2 border-blue-300 focus:outline-none focus:border-blue-500 transition duration-200"
                >
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              {formData.role === 'student' && (
                <div>
                  <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Number
                  </label>
                  <input
                    id="registrationNumber"
                    name="registrationNumber"
                    type="text"
                    required
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    className="block w-full px-2 py-2 text-base bg-transparent border-0 border-b-2 border-blue-300 focus:outline-none focus:border-blue-500 transition duration-200"
                  />
                </div>
              )}

              {formData.role === 'staff' && (
                <div>
                  <label htmlFor="teacherCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Teacher Code
                  </label>
                  <input
                    id="teacherCode"
                    name="teacherCode"
                    type="text"
                    required
                    value={formData.teacherCode}
                    onChange={handleChange}
                    className="block w-full px-2 py-2 text-base bg-transparent border-0 border-b-2 border-blue-300 focus:outline-none focus:border-blue-500 transition duration-200"
                    placeholder="Enter your unique teacher code"
                  />
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full px-2 py-2 text-base bg-transparent border-0 border-b-2 border-blue-300 focus:outline-none focus:border-blue-500 transition duration-200"
                />
                {passwordErrors.length > 0 && (
                  <div className="mt-1 text-xs text-red-600">
                    <p>Password must have:</p>
                    <ul className="list-disc list-inside">
                      {passwordErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full px-2 py-2 text-base bg-transparent border-0 border-b-2 border-blue-300 focus:outline-none focus:border-blue-500 transition duration-200"
                />
              </div>

              {formData.role === 'student' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                        Year
                      </label>
                      <select
                        id="year"
                        name="year"
                        value={formData.year}
                        onChange={handleChange}
                        className="block w-full px-2 py-2 text-sm bg-transparent border-0 border-b-2 border-blue-300 focus:outline-none focus:border-blue-500 transition duration-200"
                      >
                        <option value="">Select Year</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-2">
                        Semester
                      </label>
                      <select
                        id="semester"
                        name="semester"
                        value={formData.semester}
                        onChange={handleChange}
                        className="block w-full px-2 py-2 text-sm bg-transparent border-0 border-b-2 border-blue-300 focus:outline-none focus:border-blue-500 transition duration-200"
                      >
                        <option value="">Select Semester</option>
                        <option value="1">1st Semester</option>
                        <option value="2">2nd Semester</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-2">
                      Course
                    </label>
                    <input
                      id="course"
                      name="course"
                      type="text"
                      value={formData.course}
                      onChange={handleChange}
                      className="block w-full px-2 py-2 text-base bg-transparent border-0 border-b-2 border-blue-300 focus:outline-none focus:border-blue-500 transition duration-200"
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                </>
              )}

              {formData.role === 'staff' && (
                <>
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Subject Taught
                    </label>
                    <input
                      id="subject"
                      name="subject"
                      type="text"
                      value={formData.subject}
                      onChange={handleChange}
                      className="block w-full px-2 py-2 text-base bg-transparent border-0 border-b-2 border-blue-300 focus:outline-none focus:border-blue-500 transition duration-200"
                      placeholder="e.g., Mathematics"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                        Year
                      </label>
                      <select
                        id="year"
                        name="year"
                        value={formData.year}
                        onChange={handleChange}
                        className="block w-full px-2 py-2 text-sm bg-transparent border-0 border-b-2 border-blue-300 focus:outline-none focus:border-blue-500 transition duration-200"
                      >
                        <option value="">Select Year</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-2">
                        Semester
                      </label>
                      <select
                        id="semester"
                        name="semester"
                        value={formData.semester}
                        onChange={handleChange}
                        className="block w-full px-2 py-2 text-sm bg-transparent border-0 border-b-2 border-blue-300 focus:outline-none focus:border-blue-500 transition duration-200"
                      >
                        <option value="">Select Semester</option>
                        <option value="1">1st Semester</option>
                        <option value="2">2nd Semester</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-r-lg">
                  <span className="text-red-600 text-sm">{error}</span>
                </div>
              )}

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 text-white font-medium rounded-lg shadow-lg transition duration-200 hover:shadow-xl"
                  style={{ 
                    backgroundColor: '#3b82f6',
                    fontSize: '15px'
                  }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </div>
                  ) : (
                    'Register'
                  )}
                </button>
              </div>

              <div className="text-center pt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-[#fdfcf8] text-gray-500">
                      Already have an account?
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-sm text-gray-600">
                    Want to sign in?{' '}
                    <Link 
                      to="/login" 
                      className="font-medium text-blue-600 hover:text-blue-500 transition duration-200 hover:underline"
                    >
                      Sign in here
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

export default Register;
