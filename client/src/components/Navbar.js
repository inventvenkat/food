import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui';

const Navbar = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const NavLink = ({ to, children, onClick }) => (
    <Link
      to={to}
      onClick={onClick}
      className="text-neutral-600 hover:text-primary-600 hover:bg-primary-50 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
    >
      {children}
    </Link>
  );

  return (
    <nav className="bg-white border-b border-neutral-200 sticky top-0 z-50">
      <div className="container-app">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg gradient-warm flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="font-serif font-bold text-xl text-neutral-900">RecipeApp</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/discover">Discover</NavLink>
            
            {currentUser ? (
              <>
                <NavLink to="/meal-planner">Meal Planner</NavLink>
                <NavLink to="/my-recipes">My Recipes</NavLink>
                <NavLink to="/my-collections">Collections</NavLink>
                
                <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-neutral-200">
                  <Button
                    as={Link}
                    to="/create-recipe"
                    size="sm"
                    className="!no-underline"
                  >
                    Create Recipe
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-neutral-600">
                      Welcome, <span className="font-medium text-neutral-900">{currentUser.username}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogoutClick}
                    >
                      Logout
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  as={Link}
                  to="/login"
                  variant="ghost"
                  size="sm"
                  className="!no-underline"
                >
                  Login
                </Button>
                <Button
                  as={Link}
                  to="/register"
                  size="sm"
                  className="!no-underline"
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-lg text-neutral-600 hover:text-primary-600 hover:bg-primary-50 transition-colors duration-200"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-neutral-200">
            <div className="flex flex-col space-y-2">
              <NavLink to="/" onClick={() => setIsMobileMenuOpen(false)}>Home</NavLink>
              <NavLink to="/discover" onClick={() => setIsMobileMenuOpen(false)}>Discover</NavLink>
              
              {currentUser ? (
                <>
                  <NavLink to="/meal-planner" onClick={() => setIsMobileMenuOpen(false)}>Meal Planner</NavLink>
                  <NavLink to="/my-recipes" onClick={() => setIsMobileMenuOpen(false)}>My Recipes</NavLink>
                  <NavLink to="/my-collections" onClick={() => setIsMobileMenuOpen(false)}>Collections</NavLink>
                  <NavLink to="/create-recipe" onClick={() => setIsMobileMenuOpen(false)}>Create Recipe</NavLink>
                  
                  <div className="pt-3 mt-3 border-t border-neutral-200">
                    <p className="px-3 py-2 text-sm text-neutral-600">
                      Welcome, <span className="font-medium text-neutral-900">{currentUser.username}</span>
                    </p>
                    <button
                      onClick={() => {
                        handleLogoutClick();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <div className="pt-3 mt-3 border-t border-neutral-200 space-y-2">
                  <NavLink to="/login" onClick={() => setIsMobileMenuOpen(false)}>Login</NavLink>
                  <NavLink to="/register" onClick={() => setIsMobileMenuOpen(false)}>Get Started</NavLink>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
