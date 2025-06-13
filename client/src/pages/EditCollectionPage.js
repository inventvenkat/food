import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const EditCollectionPage = () => {
  const { id: collectionId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
    recipes: [], // Store array of selected recipe IDs
  });
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [currentCoverImageUrl, setCurrentCoverImageUrl] = useState('');
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);
  const [userRecipes, setUserRecipes] = useState([]); // To populate recipe selector
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCollectionData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required.'); navigate('/login'); return;
    }
    try {
      setLoading(true);
      const response = await fetch(`/api/collections/${collectionId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch collection details for editing.');
      const data = await response.json();
      setFormData({
        name: data.name || '',
        description: data.description || '',
        isPublic: data.isPublic || false,
        recipes: data.recipes ? data.recipes.map(r => r._id) : [], // Store only IDs
      });
      setCurrentCoverImageUrl(data.coverImage || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [collectionId, navigate]);

  const fetchUserRecipes = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return; // Auth check handled in fetchCollectionData
    try {
      const response = await fetch('/api/recipes', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch your recipes for selection.');
      const data = await response.json();
      setUserRecipes(data);
    } catch (err) {
      setError(prevError => prevError ? `${prevError}\n${err.message}` : err.message);
    }
  }, []);

  useEffect(() => {
    fetchCollectionData();
    fetchUserRecipes();
  }, [fetchCollectionData, fetchUserRecipes]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleRecipeSelectionChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, recipes: selectedOptions }));
  };

  const handleImageChange = (e) => {
    setCoverImageFile(e.target.files[0]);
    setCurrentCoverImageUrl(''); 
    setRemoveCurrentImage(false);
  };

  const handleRemoveImage = () => {
    setCoverImageFile(null);
    setCurrentCoverImageUrl('');
    setRemoveCurrentImage(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const token = localStorage.getItem('token');
    if (!token) { setError('Authentication required.'); return; }
    if (!formData.name) { setError('Collection name is required.'); return; }

    const submissionData = new FormData();
    submissionData.append('name', formData.name);
    submissionData.append('description', formData.description);
    submissionData.append('isPublic', formData.isPublic);
    submissionData.append('recipes', JSON.stringify(formData.recipes));

    if (coverImageFile) {
      submissionData.append('collectionCoverImage', coverImageFile);
    } else if (removeCurrentImage) {
      submissionData.append('coverImage', ''); // Signal to backend to remove image
    } else if (currentCoverImageUrl) { // If no new file, not removing, and there was an original image
      submissionData.append('coverImage', currentCoverImageUrl); // Keep existing
    }


    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: submissionData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to update collection.');
      
      setSuccess('Collection updated successfully! Redirecting...');
      setTimeout(() => navigate(`/collections/${collectionId}`), 2000);
    } catch (err) {
      setError(err.message);
      console.error("Update collection error:", err);
    }
  };

  if (loading) return <div className="text-center p-10">Loading collection for editing...</div>;
  if (error && !formData.name) return <div className="text-center p-10 text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold text-center mb-8">Edit Recipe Collection</h1>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Collection Name</label>
          <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="input-style w-full" />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
          <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows="3" className="input-style w-full"></textarea>
        </div>
        <div>
          <label htmlFor="recipes" className="block text-sm font-medium text-gray-700">Select Recipes (Ctrl/Cmd + Click for multiple)</label>
          <select multiple name="recipes" id="recipes" value={formData.recipes} onChange={handleRecipeSelectionChange} className="select-style w-full h-40">
            {userRecipes.map(recipe => (
              <option key={recipe._id} value={recipe._id}>{recipe.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="collectionCoverImage" className="block text-sm font-medium text-gray-700">Cover Image</label>
          {currentCoverImageUrl && !coverImageFile && (
            <div className="my-2">
              <img src={currentCoverImageUrl} alt="Current cover" className="h-32 w-auto rounded" />
              <button type="button" onClick={handleRemoveImage} className="text-xs text-red-500 hover:text-red-700 mt-1">Remove current image</button>
            </div>
          )}
          <input type="file" name="collectionCoverImage" id="collectionCoverImage" onChange={handleImageChange} accept="image/*" className="file-input-style w-full" />
          {coverImageFile && <p className="text-xs text-gray-500 mt-1">New image selected: {coverImageFile.name}</p>}
        </div>
        <div className="flex items-center">
          <input id="isPublic" name="isPublic" type="checkbox" checked={formData.isPublic} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
          <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">Make this collection public?</label>
        </div>
        <div className="flex items-center justify-end">
          <button type="button" onClick={() => navigate(`/collections/${collectionId}`)} className="btn-secondary mr-4">Cancel</button>
          <button type="submit" className="btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  );
};

export default EditCollectionPage;
