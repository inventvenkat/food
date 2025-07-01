import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment'; // Import moment

const DiscoverPage = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // For recipe fetch errors
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [nextLek, setNextLek] = useState(null);

  // States for public collections
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [errorCollections, setErrorCollections] = useState('');
  const [collectionsPage, setCollectionsPage] = useState(1);
  const [hasMoreCollections, setHasMoreCollections] = useState(true);
  const [collectionsNextLek, setCollectionsNextLek] = useState(null);

  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [filteredCollections, setFilteredCollections] = useState([]);
  const [searchCategory, setSearchCategory] = useState('all'); // 'all', 'recipes', 'collections'
  const [isSearching, setIsSearching] = useState(false);
  
  // Refs for debouncing and focus management
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);


  const fetchPublicRecipes = useCallback(async (isInitial = false, lastEvaluatedKey = null) => {
    setLoading(true);
    setError('');
    try {
      let url = '/api/recipes/public?limit=9'; // Fetch 9 per page for a 3-col grid
      if (lastEvaluatedKey) {
        url += `&lek=${encodeURIComponent(JSON.stringify(lastEvaluatedKey))}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to fetch public recipes');
      }
      const data = await response.json();
      setRecipes(prev => isInitial ? data.recipes : [...prev, ...data.recipes]);
      setNextLek(data.nextLek ? JSON.parse(decodeURIComponent(data.nextLek)) : null);
      setHasMore(!!data.nextLek);
      if (!isInitial) {
        setPage(prev => prev + 1); // Keep track of page number for state
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicRecipes(true); // isInitial = true
  }, [fetchPublicRecipes]);

  const fetchPublicCollections = useCallback(async (isInitial = false, lastEvaluatedKey = null) => {
    setLoadingCollections(true);
    setErrorCollections('');
    try {
      let url = '/api/collections/public?limit=6'; // Fetch 6 collections
      if (lastEvaluatedKey) {
        url += `&lek=${encodeURIComponent(JSON.stringify(lastEvaluatedKey))}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to fetch public collections');
      }
      const data = await response.json();
      setCollections(prev => isInitial ? data.collections : [...prev, ...data.collections]);
      setCollectionsNextLek(data.nextLek ? JSON.parse(decodeURIComponent(data.nextLek)) : null);
      setHasMoreCollections(!!data.nextLek);
      if (!isInitial) {
        setCollectionsPage(prev => prev + 1);
      }
    } catch (err) {
      setErrorCollections(err.message);
    } finally {
      setLoadingCollections(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicCollections(true); // isInitial = true
  }, [fetchPublicCollections]);

  // Update filtered data when original data changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRecipes(recipes);
    }
  }, [recipes, searchTerm]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCollections(collections);
    }
  }, [collections, searchTerm]);

  // Optimized search with proper debouncing
  const performSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setFilteredRecipes(recipes);
      setFilteredCollections(collections);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError('');
    setErrorCollections('');

    try {
      // Search recipes and collections in parallel
      const [recipeResponse, collectionResponse] = await Promise.all([
        fetch(`/api/recipes/search?q=${encodeURIComponent(query)}&limit=50`),
        fetch(`/api/collections/search?q=${encodeURIComponent(query)}&limit=50`)
      ]);

      if (recipeResponse.ok) {
        const recipeData = await recipeResponse.json();
        setFilteredRecipes(recipeData.recipes);
      } else {
        setError('Failed to search recipes');
        setFilteredRecipes([]);
      }

      if (collectionResponse.ok) {
        const collectionData = await collectionResponse.json();
        setFilteredCollections(collectionData.collections);
      } else {
        setErrorCollections('Failed to search collections');
        setFilteredCollections([]);
      }
    } catch (err) {
      setError('Search failed');
      setErrorCollections('Search failed');
      setFilteredRecipes([]);
      setFilteredCollections([]);
    } finally {
      setIsSearching(false);
    }
  }, [recipes, collections]);

  // Debounced search effect - only triggers after user stops typing
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If search is empty, immediately show original data
    if (!searchTerm.trim()) {
      setFilteredRecipes(recipes);
      setFilteredCollections(collections);
      setIsSearching(false);
      return;
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchTerm);
    }, 800); // Increased debounce time to 800ms

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, performSearch]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Show immediate visual feedback for typing
    if (value.trim() && !isSearching) {
      setIsSearching(true);
    }
  };

  const clearSearch = () => {
    // Clear timeout to prevent unnecessary search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    setSearchTerm('');
    setFilteredRecipes(recipes);
    setFilteredCollections(collections);
    setIsSearching(false);
    setError('');
    setErrorCollections('');
    
    // Maintain focus on search input
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const loadMoreRecipes = () => {
    if (nextLek && hasMore) {
      fetchPublicRecipes(false, nextLek); // isInitial = false, use nextLek
    }
  };

  // Combined loading state for initial load (not search loading)
  if ((loading && page === 1 && !searchTerm) || (loadingCollections && collectionsPage === 1 && !searchTerm)) {
    return <div className="text-center p-10">Loading discoveries...</div>;
  }
  // Display individual errors if they occur
  // if (error) return <div className="text-center p-10 text-red-500">Error fetching recipes: {error}</div>;
  // if (errorCollections) return <div className="text-center p-10 text-red-500">Error fetching collections: {errorCollections}</div>;


  const loadMoreCollections = () => {
    if (collectionsNextLek && hasMoreCollections) {
      fetchPublicCollections(false, collectionsNextLek); // isInitial = false, use collectionsNextLek
    }
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
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search recipes and collections by name, category, ingredients, tags, or author..."
            className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {isSearching && searchTerm && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
          {searchTerm && !isSearching && (
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
            {isSearching ? (
              <p>Searching...</p>
            ) : (
              <>
                {searchCategory === 'all' && (
                  <p>Found {displayedRecipes.length} recipe(s) and {displayedCollections.length} collection(s) for "{searchTerm}"</p>
                )}
                {searchCategory === 'recipes' && (
                  <p>Found {displayedRecipes.length} recipe(s) for "{searchTerm}"</p>
                )}
                {searchCategory === 'collections' && (
                  <p>Found {displayedCollections.length} collection(s) for "{searchTerm}"</p>
                )}
              </>
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
                className="btn-primary"
              >
                Load More Recipes
              </button>
            </div>
          )}
          {!searchTerm && loading && page > 1 && <div className="text-center p-4">Loading more recipes...</div>}
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
          {!searchTerm && loadingCollections && collectionsPage > 1 && <div className="text-center p-4">Loading more collections...</div>}
        </section>
      )}
    </div>
  );
};

export default DiscoverPage;
