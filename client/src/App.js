import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'; // Removed unused useNavigate
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CreateRecipePage from './pages/CreateRecipePage';
import MyRecipesPage from './pages/MyRecipesPage';
import ShoppingListPage from './pages/ShoppingListPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import EditRecipePage from './pages/EditRecipePage';
import MealPlannerPage from './pages/MealPlannerPage';
import DiscoverPage from './pages/DiscoverPage';
import MyCollectionsPage from './pages/MyCollectionsPage';
import CreateCollectionPage from './pages/CreateCollectionPage';
import CollectionDetailPage from './pages/CollectionDetailPage'; // Import CollectionDetailPage
import EditCollectionPage from './pages/EditCollectionPage'; // Import EditCollectionPage
import ProtectedRoute from './components/ProtectedRoute';
import { ChatWidget } from './components/AIAssistant';

// Helper to parse JWT. In a real app, consider a library like jwt-decode.
const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  // We need useNavigate for programmatic navigation after logout,
  // but since App is the provider of Router, we need a sub-component or to restructure.
  // For now, let's handle logout logic and Navbar changes.
  // Redirects will primarily be handled by LoginPage/RegisterPage for now.

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedUser = parseJwt(token);
      // Check if token is expired (simplified check, real app needs proper expiry check)
      if (decodedUser && decodedUser.exp * 1000 > Date.now()) {
        setCurrentUser({ id: decodedUser.user.id, username: decodedUser.user.username });
      } else {
        localStorage.removeItem('token'); // Token is expired or invalid
      }
    }
  }, []);

  const handleLogin = (userData) => {
    localStorage.setItem('token', userData.token);
    setCurrentUser({ id: userData.user.id, username: userData.user.username });
    // Navigation is handled by LoginPage/RegisterPage
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    // To redirect, LoginPage/RegisterPage or a wrapper component for Routes would be better.
    // For now, Navbar will just update its state. User might need to manually navigate or refresh.
    // A more robust solution would involve useNavigate, potentially by wrapping Routes in a component.
    // User logged out - no popup needed
  };

  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar currentUser={currentUser} onLogout={handleLogout} />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="/register" element={<RegisterPage onRegister={handleLogin} />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/collections/:id" element={<CollectionDetailPage />} /> {/* Public view for collections */}
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute currentUser={currentUser} />}>
              <Route path="/create-recipe" element={<CreateRecipePage />} />
              <Route path="/my-recipes" element={<MyRecipesPage />} />
              <Route path="/shopping-list" element={<ShoppingListPage />} />
              <Route path="/recipes/:id" element={<RecipeDetailPage />} />
              <Route path="/edit-recipe/:id" element={<EditRecipePage />} />
              <Route path="/meal-planner" element={<MealPlannerPage />} />
              <Route path="/my-collections" element={<MyCollectionsPage />} />
              <Route path="/create-collection" element={<CreateCollectionPage />} />
              <Route path="/edit-collection/:id" element={<EditCollectionPage />} /> 
            </Route>
            
          </Routes>
        </main>
        {/* AI Assistant Chat Widget - Available on all pages */}
        <ChatWidget />
        {/* Optional: Footer can be added here */}
      </div>
    </Router>
  );
}

export default App;
