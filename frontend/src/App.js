import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
// import { Box, Typography } from '@mui/material'; // Not needed in App.js anymore
import { AuthProvider } from './context/AuthContext'

import theme from './theme'
import { NotificationProvider } from './context/NotificationContext'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
import './App.css'

// PUBLIC
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import AdminAuthPage from './pages/AdminAuthPage'; // Import AdminAuthPage

// PROTECTED
import AnalysisPage from './pages/AnalysisPage'
import ChatPage from './pages/ChatPage'; // Import the new ChatPage component
import AnnouncementsPage from './pages/AnnouncementsPage'; // Import the AnnouncementsPage component
import GalleryPages from './pages/GalleryPages'; // Import the GalleryPages component
import VisitorsPage from './pages/VisitorsPage'; // Import the VisitorsPage component
// Import admin pages
import AdminAnnouncementsPage from './pages/AdminAnnouncementsPage';
import AdminAnnouncementsCreatePage from './pages/AdminAnnouncementsCreatePage';
import AdminAnnouncementsEditPage from './pages/AdminAnnouncementsEditPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminTemplatesPage from './pages/AdminTemplatesPage';
import AdminTemplateCreatePage from './pages/AdminTemplateCreatePage';
import AdminTemplateEditPage from './pages/AdminTemplateEditPage';

// Component to handle root route redirect based on auth status
const RootRedirect = () => {
  return (
    <PrivateRoute>
      <Navigate to="/dashboard" replace />
    </PrivateRoute>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public Routes - Sadece auth sayfaları */}
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/admin/auth" element={<AdminAuthPage />} />
              
              {/* Root route - redirects based on auth status */}
              <Route path="/" element={<RootRedirect />} />

              {/* Protected Routes with Layout - Tüm sayfalar korunuyor */}
              <Route element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }>
                <Route path="/dashboard" element={<HomePage />} />
                <Route path="/analysis" element={<AnalysisPage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/gallery" element={<GalleryPages />} />

                {/* Admin Routes */}
                <Route path="/admin/announcements" element={
                  <PrivateRoute role="admin">
                    <AdminAnnouncementsPage />
                  </PrivateRoute>
                } />
                <Route path="/admin/announcements/create" element={
                  <PrivateRoute role="admin">
                    <AdminAnnouncementsCreatePage />
                  </PrivateRoute>
                } />
                <Route path="/admin/announcements/edit/:id" element={
                  <PrivateRoute role="admin">
                    <AdminAnnouncementsEditPage />
                  </PrivateRoute>
                } />
                <Route path="/admin/users" element={
                  <PrivateRoute role="admin">
                    <AdminUsersPage />
                  </PrivateRoute>
                } />
                <Route path="/admin/templates" element={
                  <PrivateRoute role="admin">
                    <AdminTemplatesPage />
                  </PrivateRoute>
                } />
                <Route path="/admin/templates/create" element={
                  <PrivateRoute role="admin">
                    <AdminTemplateCreatePage />
                  </PrivateRoute>
                } />
                <Route path="/admin/templates/edit/:id" element={
                  <PrivateRoute role="admin">
                    <AdminTemplateEditPage />
                  </PrivateRoute>
                } />
                <Route path="/stats" element={
                  <PrivateRoute role="admin">
                    <VisitorsPage />
                  </PrivateRoute>
                } />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/auth" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  )
}

export default App
