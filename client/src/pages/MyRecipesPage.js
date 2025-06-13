import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const MyRecipesPage = () => {
  const [initialRecipes, setInitialRecipes] = useState([]); // Stores user's own recipes on load
  const [searchResults, setSearchResults] = useState([]); // Stores current display list (own or search results)
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [selectedRecipes, setSelectedRecipes] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  // This would ideally come from an AuthContext or similar
  const [currentUserId, setCurrentUserId] = useState(null); 

  useEffect(() => {
    // Simulate fetching current user ID (e.g., from decoded token)
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.user.id);
      } catch (e) {
        console.error("Failed to parse token for user ID", e);
      }
    }
  }, []);

  const fetchInitialRecipes = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to view your recipes.');
      setLoading(false);
      navigate('/login');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch('/api/recipes', { // Fetches user's own recipes
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to fetch initial recipes');
      }
      const data = await response.json();
      setInitialRecipes(data);
      setSearchResults(data); // Initially, search results are all user's recipes
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchInitialRecipes();
  }, [fetchInitialRecipes]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults(initialRecipes); // If search is cleared, show all original user recipes
      setIsSearching(false);
      return;
    }

    const handler = setTimeout(async () => {
      setIsSearching(true);
      setError(''); // Clear previous errors
      const token = localStorage.getItem('token');
      if (!token) { // Should ideally not happen if user is on this page
        setError('Authentication required for search.'); 
        setIsSearching(false); 
        return;
      }
      try {
        const response = await fetch(`/api/recipes/search?q=${encodeURIComponent(searchTerm)}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Search failed');
        }
        const data = await response.json();
        setSearchResults(data);
      } catch (err) {
        setError(err.message);
        setSearchResults([]); // Clear results on error
      } finally {
        setIsSearching(false);
      }
    }, 500); // Debounce search

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, initialRecipes, navigate]);

  const handleRecipeSelect = (recipeId) => {
    setSelectedRecipes(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(recipeId)) newSelected.delete(recipeId);
      else newSelected.add(recipeId);
      return newSelected;
    });
  };

  const handleGenerateShoppingList = () => {
    if (selectedRecipes.size === 0) {
      alert('Please select at least one recipe.'); return;
    }
    const ids = Array.from(selectedRecipes).join(',');
    // This needs to be updated if shopping list generation relies on plannedServings from MealPlan
    // For now, it generates based on default servings of selected recipes.
    navigate(`/shopping-list?recipeIds=${ids}`); 
  };

  if (loading && searchTerm.trim() === '') return <div className="text-center p-4">Loading your recipes...</div>;
  if (error) return <div className="text-center p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-8">My Recipes & Public Discoveries</h1>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <input 
          type="text"
          placeholder="Search all recipes (yours and public)..."
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm w-full sm:w-2/3 md:w-1/2"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          onClick={handleGenerateShoppingList}
          disabled={selectedRecipes.size === 0}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 w-full sm:w-auto"
        >
          Shopping List ({selectedRecipes.size} selected)
        </button>
      </div>
      {isSearching && <div className="text-center p-2">Searching...</div>}

      {!isSearching && searchResults.length === 0 && (
         <div className="text-center">
          <p>
            {searchTerm ? `No recipes found matching "${searchTerm}".` : "You haven't created any recipes yet."}
          </p>
          {!searchTerm && 
            <Link to="/create-recipe" className="text-indigo-600 hover:text-indigo-800 font-semibold">
              Create your first recipe!
            </Link>
          }
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map(recipe => {
            const isOwnedByCurrentUser = recipe.user && recipe.user._id === currentUserId;
            const displayPublicTag = recipe.isPublic && !isOwnedByCurrentUser;
            
            return (
              <div key={recipe._id} className="bg-white shadow-lg rounded-lg overflow-hidden relative">
                <label htmlFor={`recipe-${recipe._id}`} className="block cursor-pointer">
                  {isOwnedByCurrentUser && ( // Only show checkbox for owned recipes
                    <input 
                      type="checkbox" 
                      id={`recipe-${recipe._id}`}
                      checked={selectedRecipes.has(recipe._id)}
                      onChange={() => handleRecipeSelect(recipe._id)}
                      className="absolute top-2 right-2 m-2 h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 z-10"
                    />
                  )}
                  {recipe.image && (
                    <img src={recipe.image} alt={recipe.name} className="w-full h-48 object-cover"/>
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <Link to={`/recipes/${recipe._id}`} className="hover:text-indigo-700 flex-grow mr-2">
                        <h3 className="text-xl font-semibold">{recipe.name}</h3>
                      </Link>
                      {displayPublicTag && 
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">Public</span>
                      }
                       {isOwnedByCurrentUser && recipe.isPublic &&
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">My Public</span>
                      }
                       {isOwnedByCurrentUser && !recipe.isPublic &&
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full whitespace-nowrap">My Private</span>
                      }
                    </div>
                    {recipe.user && <p className="text-xs text-gray-500 mb-1">By: {recipe.user.username}</p>}
                    <p className="text-gray-600 text-sm mb-1">Time: {recipe.cookingTime}</p>
                    <p className="text-gray-600 text-sm mb-3">Serves: {recipe.servings}</p>
                  </div>
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyRecipesPage;
