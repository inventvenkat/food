import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

const CollectionDetailPage = () => {
  const { id: collectionId } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.user.id);
      } catch (e) { console.error("Failed to parse token for user ID", e); }
    }
  }, []);

  const fetchCollectionDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // The backend GET /api/collections/:id handles public/private access logic
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/collections/${collectionId}`, { headers });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || `Failed to fetch collection (status: ${response.status})`);
      }
      const data = await response.json();
      setCollection(data);
    } catch (err) {
      setError(err.message);
      console.error("Fetch collection detail error:", err);
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    if (collectionId) {
      fetchCollectionDetails();
    }
  }, [collectionId, fetchCollectionDetails]);

  const handleDeleteCollection = async () => {
    // Delete collection without confirmation
    const token = localStorage.getItem('token');
    if (!token || !collection || currentUserId !== collection.user._id) {
      setError('You are not authorized to delete this collection.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to delete collection.');
      }
      // Collection deleted - navigate back silently
      navigate('/my-collections');
    } catch (err) {
      setError(err.message);
      console.error("Delete collection error:", err);
    }
  };

  if (loading) return <div className="text-center p-10">Loading collection details...</div>;
  if (error) return <div className="text-center p-10 text-red-500">Error: {error}</div>;
  if (!collection) return <div className="text-center p-10">Collection not found.</div>;

  const isOwner = currentUserId && collection.user && collection.user._id === currentUserId;

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white shadow-xl rounded-lg p-6 mb-6">
        {collection.coverImage && (
          <img src={collection.coverImage} alt={collection.name} className="w-full h-64 object-cover rounded-md mb-6"/>
        )}
        <div className="flex justify-between items-start">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{collection.name}</h1>
            <span className={`text-sm px-3 py-1 rounded-full ${collection.isPublic ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                {collection.isPublic ? 'Public' : 'Private'}
            </span>
        </div>
        {collection.user && <p className="text-sm text-gray-500 mb-4">By: {collection.user.username}</p>}
        {collection.description && <p className="text-gray-700 mb-6 whitespace-pre-wrap">{collection.description}</p>}

        {isOwner && (
          <div className="flex space-x-4 mb-6">
            <Link to={`/edit-collection/${collection._id}`} className="btn-primary">Edit Collection</Link>
            <button onClick={handleDeleteCollection} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Delete Collection</button>
          </div>
        )}
      </div>

      <h2 className="text-2xl font-semibold text-gray-700 mb-4">Recipes in this Collection ({collection.recipes ? collection.recipes.length : 0})</h2>
      {collection.recipes && collection.recipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collection.recipes.map(recipe => (
            <div key={recipe._id} className="bg-white shadow-lg rounded-lg overflow-hidden">
              <Link to={`/recipes/${recipe._id}`}>
                {recipe.image && <img src={recipe.image} alt={recipe.name} className="w-full h-48 object-cover hover:opacity-80 transition-opacity"/>}
              </Link>
              <div className="p-4">
                <Link to={`/recipes/${recipe._id}`} className="hover:text-indigo-700">
                  <h3 className="text-xl font-semibold mb-2 truncate">{recipe.name}</h3>
                </Link>
                <p className="text-gray-600 text-sm mb-1">Time: {recipe.cookingTime}</p>
                <p className="text-gray-600 text-sm mb-3">Serves: {recipe.servings}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>This collection currently has no recipes.</p>
      )}
    </div>
  );
};

export default CollectionDetailPage;
