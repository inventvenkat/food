import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RichTextEditor from '../components/RichTextEditor';

const EditRecipePage = () => {
  const { id: recipeId } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cookingTime: '',
    servings: '',
    instructions: '',
    category: '',
    tags: '',
    ingredients: [], 
    image: '', 
    isPublic: false, // New state for public toggle
  });
  const [imageFile, setImageFile] = useState(null); 
  const [currentImageUrl, setCurrentImageUrl] = useState(''); // To display current image
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false); // Flag to remove image

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchRecipeData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required.');
      navigate('/login');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`/api/recipes/${recipeId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch recipe details for editing.');
      const data = await response.json();
      setFormData({
        name: data.name || '',
        description: data.description || '',
        cookingTime: data.cookingTime || '',
        servings: data.servings || '',
        instructions: data.instructions || '',
        category: data.category || '',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
        ingredients: data.ingredients && data.ingredients.length > 0 ? data.ingredients : [{ name: '', quantity: '1', unit: '' }],
        image: data.image || '',
        isPublic: data.isPublic || false, // Populate isPublic
      });
      setCurrentImageUrl(data.image || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [recipeId, navigate]);

  useEffect(() => {
    fetchRecipeData();
  }, [fetchRecipeData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleInstructionsChange = (content) => {
    setFormData(prev => ({ ...prev, instructions: content }));
  };

  // handleChange in EditRecipePage already handles checkbox types from CreateRecipePage copy
  // const handleChange = (e) => {
  //   const { name, value, type, checked } = e.target;
  //   setFormData(prev => ({
  //     ...prev,
  //     [name]: type === 'checkbox' ? checked : value,
  //   }));
  // };

  const handleIngredientChange = (index, event) => {
    const newIngredients = formData.ingredients.map((ing, i) => 
      index === i ? { ...ing, [event.target.name]: event.target.value } : ing
    );
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const addIngredientField = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', quantity: '1', unit: '' }],
    }));
  };

  const removeIngredientField = (index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
    setCurrentImageUrl(''); // Clear current image preview if new one is selected
    setRemoveCurrentImage(false); // If new image is selected, don't remove
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setCurrentImageUrl('');
    setRemoveCurrentImage(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');

    const submissionData = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'ingredients') {
        submissionData.append(key, JSON.stringify(formData.ingredients));
      } else if (key === 'tags') {
        submissionData.append(key, formData.tags); // Backend handles splitting/parsing
      } else if (key !== 'image') { // Don't append the old image URL directly
        submissionData.append(key, formData[key]);
      }
    });

    if (imageFile) {
      submissionData.append('recipeImage', imageFile); // New image
    } else if (removeCurrentImage) {
      submissionData.append('image', ''); // Signal to backend to remove image
    } else if (formData.image) {
      // If no new image and not removing, and there was an original image, send its URL
      // This tells backend to keep the existing image if no new one is uploaded
      submissionData.append('image', formData.image);
    }
    // If formData.image is empty and not removing, and no new file, 'image' field won't be sent, backend keeps old.

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }, // Content-Type set by browser for FormData
        body: submissionData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to update recipe.');
      setSuccess('Recipe updated successfully! Redirecting...');
      setTimeout(() => navigate(`/recipes/${recipeId}`), 2000);
    } catch (err) {
      setError(err.message);
      console.error("Update recipe error:", err);
    }
  };

  if (loading) return <div className="text-center p-10">Loading recipe for editing...</div>;
  if (error && !formData.name) return <div className="text-center p-10 text-red-600">Error: {error}</div>; // Show full page error if initial load fails

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold text-center mb-8">Edit Recipe</h1>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        {/* Name, Description, CookingTime, Servings - similar to CreateRecipePage */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Recipe Name</label>
          <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full input-style" />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows="3" className="mt-1 block w-full input-style"></textarea>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="cookingTime" className="block text-sm font-medium text-gray-700">Cooking Time</label>
            <input type="text" name="cookingTime" id="cookingTime" value={formData.cookingTime} onChange={handleChange} required className="mt-1 block w-full input-style" />
          </div>
          <div>
            <label htmlFor="servings" className="block text-sm font-medium text-gray-700">Servings</label>
            <input type="number" name="servings" id="servings" value={formData.servings} onChange={handleChange} required min="1" className="mt-1 block w-full input-style" />
          </div>
        </div>
        
        {/* Instructions with RichTextEditor */}
        <div>
          <label htmlFor="instructions" className="block text-sm font-medium text-gray-700">Instructions</label>
          <RichTextEditor value={formData.instructions} onChange={handleInstructionsChange} placeholder="Recipe steps..." />
        </div>

        {/* Category and Tags */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
          <input type="text" name="category" id="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full input-style" />
        </div>
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
          <input type="text" name="tags" id="tags" value={formData.tags} onChange={handleChange} className="mt-1 block w-full input-style" />
        </div>

        {/* Ingredients Section */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Ingredients</label>
          {formData.ingredients && formData.ingredients.map((ingredient, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 border rounded-md">
              <input type="text" name="quantity" placeholder="Qty" value={ingredient.quantity} onChange={(e) => handleIngredientChange(index, e)} className="w-1/5 input-style-sm" />
              <input type="text" name="unit" placeholder="Unit" value={ingredient.unit} onChange={(e) => handleIngredientChange(index, e)} className="w-1/5 input-style-sm" />
              <input type="text" name="name" placeholder="Ingredient Name" value={ingredient.name} onChange={(e) => handleIngredientChange(index, e)} required className="flex-grow input-style-sm" />
              <button type="button" onClick={() => removeIngredientField(index)} className="text-red-500 hover:text-red-700 font-semibold">Remove</button>
            </div>
          ))}
          <button type="button" onClick={addIngredientField} className="mt-2 btn-secondary">Add Ingredient</button>
        </div>

        {/* Image Upload Section */}
        <div>
          <label htmlFor="recipeImage" className="block text-sm font-medium text-gray-700">Recipe Image</label>
          {currentImageUrl && !imageFile && (
            <div className="my-2">
              <img src={currentImageUrl} alt="Current recipe" className="h-40 w-auto rounded" />
              <button type="button" onClick={handleRemoveImage} className="text-xs text-red-500 hover:text-red-700 mt-1">Remove current image</button>
            </div>
          )}
          <input type="file" name="recipeImage" id="recipeImage" onChange={handleImageChange} accept="image/*" className="mt-1 file-input-style" />
          {imageFile && <p className="text-xs text-gray-500 mt-1">New image selected: {imageFile.name}</p>}
        </div>

        {/* isPublic Toggle */}
        <div className="flex items-center">
          <input
            id="isPublic"
            name="isPublic"
            type="checkbox"
            checked={formData.isPublic}
            onChange={handleChange} // Existing handleChange should work
            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
            Make this recipe public?
          </label>
        </div>

        <div className="flex items-center justify-between pt-4">
          <button type="button" onClick={() => navigate(`/recipes/${recipeId}`)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Cancel</button>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Save Changes</button>
        </div>
      </form>
      {/* 
        CSS classes like .input-style, .btn-primary, .btn-secondary should be defined globally (e.g., in index.css using @layer components) 
        or applied directly using Tailwind utility classes on each element.
        For now, assuming they will be styled via direct Tailwind utilities or existing global CSS.
      */}
    </div>
  );
};

export default EditRecipePage;
