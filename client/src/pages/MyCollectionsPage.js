import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const MyCollectionsPage = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchCollections = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to view your collections.');
      setLoading(false);
      navigate('/login');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch('/api/collections', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to fetch collections');
      }
      const data = await response.json();
      setCollections(data.collections || []); // Ensure 'collections' is an array
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  if (loading) return <div className="text-center p-10">Loading your collections...</div>;
  if (error) return <div className="text-center p-10 text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Recipe Collections</h1>
        <Link to="/create-collection" className="btn-primary">
          Create New Collection
        </Link>
      </div>

      {collections.length === 0 ? (
        <div className="text-center">
          <p>You haven't created any recipe collections yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map(collection => (
            <div key={collection._id} className="bg-white shadow-lg rounded-lg overflow-hidden">
              {collection.coverImage && (
                <Link to={`/collections/${collection._id}`}>
                  <img src={collection.coverImage} alt={collection.name} className="w-full h-48 object-cover hover:opacity-80 transition-opacity"/>
                </Link>
              )}
              <div className="p-4">
                <Link to={`/collections/${collection._id}`} className="hover:text-indigo-700">
                  <h3 className="text-xl font-semibold mb-2 truncate">{collection.name}</h3>
                </Link>
                <p className="text-gray-600 text-sm mb-1 truncate">{collection.description || 'No description.'}</p>
                <p className="text-gray-500 text-xs mb-2">{collection.recipes.length} recipe(s)</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${collection.isPublic ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                  {collection.isPublic ? 'Public' : 'Private'}
                </span>
                {/* Add Edit/Delete links later, or view details will have them */}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* .btn-primary class is expected to be globally defined (e.g., in index.css) */}
    </div>
  );
};

export default MyCollectionsPage;
