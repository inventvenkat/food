import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const CreateCollectionPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
    recipes: [], // Store array of selected recipe IDs
  });
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [userRecipes, setUserRecipes] = useState([]); // To populate recipe selector
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch user's recipes for selection
  const fetchUserRecipes = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required.');
      navigate('/login');
      return;
    }
    try {
      const response = await fetch('/api/recipes', { // Endpoint to get user's own recipes
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch your recipes for selection.');
      const data = await response.json();
      setUserRecipes(data);
    } catch (err) {
      setError(err.message);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUserRecipes();
  }, [fetchUserRecipes]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRecipeSelectionChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, recipes: selectedOptions }));
  };

  const handleImageChange = (e) => {
    setCoverImageFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required.'); return;
    }
    if (!formData.name) {
      setError('Collection name is required.'); return;
    }

    const submissionData = new FormData();
    submissionData.append('name', formData.name);
    submissionData.append('description', formData.description);
    submissionData.append('isPublic', formData.isPublic);
    submissionData.append('recipes', JSON.stringify(formData.recipes)); // Send as JSON string array

    if (coverImageFile) {
      submissionData.append('collectionCoverImage', coverImageFile);
    }

    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // Content-Type set by FormData
        body: submissionData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to create collection.');
      
      setSuccess('Collection created successfully! Redirecting...');
      setTimeout(() => navigate('/my-collections'), 2000); // Or to the new collection's page
    } catch (err) {
      setError(err.message);
      console.error("Create collection error:", err);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold text-center mb-8">Create New Recipe Collection</h1>
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
          <select 
            multiple 
            name="recipes" 
            id="recipes" 
            value={formData.recipes} 
            onChange={handleRecipeSelectionChange} 
            className="select-style w-full h-40"
          >
            {userRecipes.length === 0 && <option disabled>Loading your recipes...</option>}
            {userRecipes.map(recipe => (
              <option key={recipe._id} value={recipe._id}>{recipe.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="collectionCoverImage" className="block text-sm font-medium text-gray-700">Cover Image (Optional)</label>
          <input type="file" name="collectionCoverImage" id="collectionCoverImage" onChange={handleImageChange} accept="image/*" className="file-input-style w-full" />
        </div>
        <div className="flex items-center">
          <input id="isPublic" name="isPublic" type="checkbox" checked={formData.isPublic} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
          <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">Make this collection public?</label>
        </div>
        <div className="flex items-center justify-end">
          <button type="button" onClick={() => navigate('/my-collections')} className="btn-secondary mr-4">Cancel</button>
          <button type="submit" className="btn-primary">Create Collection</button>
        </div>
      </form>
    </div>
  );
};

export default CreateCollectionPage;
