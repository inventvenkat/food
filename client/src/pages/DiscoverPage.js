import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment'; // Import moment

const DiscoverPage = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // For recipe fetch errors
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // States for public collections
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [errorCollections, setErrorCollections] = useState('');
  const [collectionsPage, setCollectionsPage] = useState(1);
  const [hasMoreCollections, setHasMoreCollections] = useState(true);

  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [filteredCollections, setFilteredCollections] = useState([]);
  const [searchCategory, setSearchCategory] = useState('all'); // 'all', 'recipes', 'collections'


  const fetchPublicRecipes = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/recipes/public?page=${pageNum}&limit=9`); // Fetch 9 per page for a 3-col grid
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to fetch public recipes');
      }
      const data = await response.json();
      setRecipes(prev => pageNum === 1 ? data.recipes : [...prev, ...data.recipes]);
      // setTotalPages(data.totalPages); // Not used
      setHasMore(data.currentPage < data.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicRecipes(1); 
  }, [fetchPublicRecipes]);

  const fetchPublicCollections = useCallback(async (pageNum = 1) => {
    setLoadingCollections(true);
    setErrorCollections('');
    try {
      const response = await fetch(`/api/collections/public?page=${pageNum}&limit=6`); // Fetch 6 collections
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to fetch public collections');
      }
      const data = await response.json();
      setCollections(prev => pageNum === 1 ? data.collections : [...prev, ...data.collections]);
      setHasMoreCollections(data.currentPage < data.totalPages);
    } catch (err) {
      setErrorCollections(err.message);
    } finally {
      setLoadingCollections(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicCollections(1); // Fetch initial page of collections
  }, [fetchPublicCollections]);

  // Search and filter logic
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRecipes(recipes);
      setFilteredCollections(collections);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    
    // Filter recipes
    const filteredRecipeResults = recipes.filter(recipe => 
      recipe.name.toLowerCase().includes(searchLower) ||
      (recipe.description && recipe.description.toLowerCase().includes(searchLower)) ||
      (recipe.category && recipe.category.toLowerCase().includes(searchLower)) ||
      (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(searchLower))) ||
      (recipe.user && recipe.user.username.toLowerCase().includes(searchLower))
    );

    // Filter collections  
    const filteredCollectionResults = collections.filter(collection =>
      collection.name.toLowerCase().includes(searchLower) ||
      (collection.description && collection.description.toLowerCase().includes(searchLower)) ||
      (collection.user && collection.user.username.toLowerCase().includes(searchLower))
    );

    setFilteredRecipes(filteredRecipeResults);
    setFilteredCollections(filteredCollectionResults);
  }, [searchTerm, recipes, collections]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const loadMoreRecipes = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPublicRecipes(nextPage);
  };

  // Combined loading state for initial load
  if ((loading && page === 1) || (loadingCollections && collectionsPage === 1)) {
    return <div className="text-center p-10">Loading discoveries...</div>;
  }
  // Display individual errors if they occur
  // if (error) return <div className="text-center p-10 text-red-500">Error fetching recipes: {error}</div>;
  // if (errorCollections) return <div className="text-center p-10 text-red-500">Error fetching collections: {errorCollections}</div>;


  const loadMoreCollections = () => {
    const nextPage = collectionsPage + 1;
    setCollectionsPage(nextPage);
    fetchPublicCollections(nextPage);
  };

  // Determine which data to display
  const displayedRecipes = searchTerm ? filteredRecipes : recipes;
  const displayedCollections = searchTerm ? filteredCollections : collections;
  const showRecipesSection = searchCategory === 'all' || searchCategory === 'recipes';
  const showCollectionsSection = searchCategory === 'all' || searchCategory === 'collections';

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-8">Discover Recipes & Collections</h1>
      
      {/* Search Section */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search recipes and collections by name, category, ingredients, tags, or author..."
            className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Search Category Filter */}
        <div className="flex justify-center mt-4 space-x-2">
          <button
            onClick={() => setSearchCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              searchCategory === 'all' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSearchCategory('recipes')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              searchCategory === 'recipes' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Recipes Only
          </button>
          <button
            onClick={() => setSearchCategory('collections')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              searchCategory === 'collections' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Collections Only
          </button>
        </div>

        {/* Search Results Summary */}
        {searchTerm && (
          <div className="text-center mt-4 text-gray-600">
            {searchCategory === 'all' && (
              <p>Found {displayedRecipes.length} recipe(s) and {displayedCollections.length} collection(s) for "{searchTerm}"</p>
            )}
            {searchCategory === 'recipes' && (
              <p>Found {displayedRecipes.length} recipe(s) for "{searchTerm}"</p>
            )}
            {searchCategory === 'collections' && (
              <p>Found {displayedCollections.length} collection(s) for "{searchTerm}"</p>
            )}
          </div>
        )}
      </div>
      
      {/* Public Recipes Section */}
      {showRecipesSection && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6 border-b pb-2">
            {searchTerm ? `Recipes (${displayedRecipes.length})` : 'Public Recipes'}
          </h2>
          {error && <p className="text-red-500 text-center mb-4">Error fetching recipes: {error}</p>}
          {displayedRecipes.length === 0 && !loading && !error && (
            <p className="text-center text-gray-600">
              {searchTerm ? `No recipes found for "${searchTerm}".` : 'No public recipes available at the moment.'}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedRecipes.map(recipe => (
          <div key={recipe._id} className="bg-white shadow-lg rounded-lg overflow-hidden">
            <Link to={`/recipes/${recipe._id}`}>
              {recipe.image && (
                <img src={recipe.image} alt={recipe.name} className="w-full h-48 object-cover hover:opacity-80 transition-opacity"/>
              )}
            </Link>
            <div className="p-4">
              <Link to={`/recipes/${recipe._id}`} className="hover:text-indigo-700">
                <h3 className="text-xl font-semibold mb-2 truncate">{recipe.name}</h3>
              </Link>
              {recipe.user && <p className="text-xs text-gray-500 mb-1">By: {recipe.user.username}</p>}
              <p className="text-gray-600 text-sm mb-1 truncate">{recipe.description || 'No description available.'}</p>
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                <span>{recipe.category || 'Uncategorized'}</span>
                <span>{moment(recipe.createdAt).fromNow()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

          {!searchTerm && hasMore && !loading && (
            <div className="text-center mt-8">
              <button
                onClick={loadMoreRecipes}
                className="btn-primary" // Assuming .btn-primary is globally available or defined via style jsx
              >
                Load More Recipes
              </button>
            </div>
          )}
          {loading && page > 1 && <div className="text-center p-4">Loading more recipes...</div>}
        </section>
      )}

      {/* Public Collections Section */}
      {showCollectionsSection && (
        <section>
          <h2 className="text-2xl font-semibold text-gray-700 mb-6 border-b pb-2">
            {searchTerm ? `Collections (${displayedCollections.length})` : 'Public Recipe Collections'}
          </h2>
          {errorCollections && <p className="text-red-500 text-center mb-4">Error fetching collections: {errorCollections}</p>}
          {displayedCollections.length === 0 && !loadingCollections && !errorCollections && (
            <p className="text-center text-gray-600">
              {searchTerm ? `No collections found for "${searchTerm}".` : 'No public collections available at the moment.'}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedCollections.map(collection => (
            <div key={collection._id} className="bg-white shadow-lg rounded-lg overflow-hidden">
              <Link to={`/collections/${collection._id}`}>
                {collection.coverImage && (
                  <img src={collection.coverImage} alt={collection.name} className="w-full h-48 object-cover hover:opacity-80 transition-opacity"/>
                )}
                {!collection.coverImage && ( // Placeholder if no cover image
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">No Image</div>
                )}
              </Link>
              <div className="p-4">
                <Link to={`/collections/${collection._id}`} className="hover:text-indigo-700">
                  <h3 className="text-xl font-semibold mb-2 truncate">{collection.name}</h3>
                </Link>
                {collection.user && <p className="text-xs text-gray-500 mb-1">By: {collection.user.username}</p>}
                <p className="text-gray-600 text-sm mb-1 truncate">{collection.description || 'No description.'}</p>
                <p className="text-gray-500 text-xs">{collection.recipes ? collection.recipes.length : 0} recipe(s)</p>
              </div>
            </div>
          ))}
        </div>
          {!searchTerm && hasMoreCollections && !loadingCollections && (
            <div className="text-center mt-8">
              <button onClick={loadMoreCollections} className="btn-primary">
                Load More Collections
              </button>
            </div>
          )}
          {loadingCollections && collectionsPage > 1 && <div className="text-center p-4">Loading more collections...</div>}
        </section>
      )}
    </div>
  );
};

export default DiscoverPage;
