import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login'); // Redirect to login after logout
  };

  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-white text-xl font-bold">
          RecipeApp
        </Link>
        <div className="space-x-4 flex items-center">
          <Link to="/" className="text-gray-300 hover:text-white">
            Home
          </Link>
          <Link to="/discover" className="text-gray-300 hover:text-white">
            Discover
          </Link>
          {currentUser ? (
            <>
              <Link to="/meal-planner" className="text-gray-300 hover:text-white">
                Meal Planner
              </Link>
              <Link to="/my-recipes" className="text-gray-300 hover:text-white">
                My Recipes
              </Link>
              <Link to="/my-collections" className="text-gray-300 hover:text-white">
                My Collections
              </Link>
              <Link to="/create-recipe" className="text-gray-300 hover:text-white">
                Create Recipe
              </Link>
              <span className="text-gray-300">Welcome, {currentUser.username}!</span>
              <button
                onClick={handleLogoutClick}
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-300 hover:text-white">
                Login
              </Link>
              <Link to="/register" className="text-gray-300 hover:text-white">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
