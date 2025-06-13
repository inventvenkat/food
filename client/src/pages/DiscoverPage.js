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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-8">Discover Recipes & Collections</h1>
      
      {/* Public Recipes Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6 border-b pb-2">Public Recipes</h2>
        {error && <p className="text-red-500 text-center mb-4">Error fetching recipes: {error}</p>}
        {recipes.length === 0 && !loading && !error && (
          <p className="text-center text-gray-600">No public recipes available at the moment.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map(recipe => (
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

      {hasMore && !loading && (
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

      {/* Public Collections Section */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-6 border-b pb-2">Public Recipe Collections</h2>
        {errorCollections && <p className="text-red-500 text-center mb-4">Error fetching collections: {errorCollections}</p>}
        {collections.length === 0 && !loadingCollections && !errorCollections && (
          <p className="text-center text-gray-600">No public collections available at the moment.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map(collection => (
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
        {hasMoreCollections && !loadingCollections && (
          <div className="text-center mt-8">
            <button onClick={loadMoreCollections} className="btn-primary">
              Load More Collections
            </button>
          </div>
        )}
        {loadingCollections && collectionsPage > 1 && <div className="text-center p-4">Loading more collections...</div>}
      </section>
    </div>
  );
};

export default DiscoverPage;
