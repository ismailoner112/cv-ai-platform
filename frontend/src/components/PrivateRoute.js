// src/components/PrivateRoute.js
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Admin yetkisi gerektiren yollar
const adminRoutes = [
  '/stats',
  '/admin/gallery',
  '/admin/announcements',
  '/admin/announcements/create',
  '/admin/announcements/edit/:id', // Dinamik rota params ile
  '/admin/users',
  '/admin/templates',
  '/admin/templates/create',
  '/admin/templates/edit/:id', // Dinamik rota params ile
];

export default function PrivateRoute({ children, role }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();

  const requiresAdmin = adminRoutes.some(route => 
    route.endsWith('/:id') 
      ? location.pathname.startsWith(route.replace('/:id', ''))
      : location.pathname === route
  );

  console.log('PrivateRoute render logic - authLoading:', authLoading, 'isAuthenticated:', isAuthenticated, 'user:', user);

  if (authLoading) {
    console.log('PrivateRoute rendering loading state from AuthContext');
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f5f5f5'
      }}>
        <div style={{ 
          padding: '2rem',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          Yükleniyor...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('PrivateRoute rendering Navigate to /auth');
    // Redirect to auth page but save the attempted url
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (role && user?.role !== role) {
    // If role is specified and user doesn't have it, redirect to home
    return <Navigate to="/" replace />;
  }

  console.log('PrivateRoute rendering children');
  return children;
}
