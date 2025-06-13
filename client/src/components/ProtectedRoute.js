import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ currentUser, redirectPath = '/login' }) => {
  // Check for token in localStorage as a fallback,
  // currentUser prop from App.js is the primary check.
  const token = localStorage.getItem('token');

  if (!currentUser && !token) {
    // If no currentUser from App state and no token in localStorage, redirect.
    return <Navigate to={redirectPath} replace />;
  }
  
  // If currentUser exists (passed from App.js after verifying token) or token exists (less secure, but a fallback)
  // Outlet will render the child route's element
  return <Outlet />;
};

export default ProtectedRoute;
