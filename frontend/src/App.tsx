import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { store, RootState, AppDispatch } from './store';
import { getCurrentUser } from './store/authSlice';
import { SentryErrorBoundary } from './sentryStub';

// Components
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import DashboardHome from './components/DashboardHome';
import Notepad from './components/Notepad';
import Whiteboard from './components/Whiteboard';
import PDFManager from './components/PDFManager';
import StaffSearch from './pages/StaffSearch';
import FileViewerPage from './pages/FileViewerPage';

// Protected Route Component for Staff Only
const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  return user?.role === 'staff' ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const AppRoutes: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (token && !user) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, token, user]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />}>
        <Route index element={<DashboardHome />} />
  {/* Notes accessible to both roles */}
  <Route path="notes" element={<Notepad />} />
  <Route path="whiteboard" element={<Whiteboard />} />
  <Route path="pdf" element={<PDFManager />} />
      </Route>
      <Route path="/staff-search" element={<StaffSearch />} />
  <Route path="/file/:id/view" element={<FileViewerPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <SentryErrorBoundary>
        <Router>
          <div className="App">
            <AppRoutes />
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </div>
        </Router>
      </SentryErrorBoundary>
    </Provider>
  );
};

export default App;
