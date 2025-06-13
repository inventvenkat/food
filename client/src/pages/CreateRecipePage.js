import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RichTextEditor from '../components/RichTextEditor'; // Import RichTextEditor

const CreateRecipePage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cookingTime: '',
    servings: '',
    instructions: '', 
    category: '',
    tags: '', // Comma-separated string for now
    ingredients: [{ name: '', quantity: '1', unit: '' }], 
    isPublic: false, // New state for public toggle
  });
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleInstructionsChange = (content) => {
    setFormData(prev => ({ ...prev, instructions: content }));
  };

  const handleIngredientChange = (index, event) => {
    const newIngredients = formData.ingredients.map((ingredient, i) => {
      if (index === i) {
        return { ...ingredient, [event.target.name]: event.target.value };
      }
      return ingredient;
    });
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const addIngredientField = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { name: '', quantity: '1', unit: '' }],
    });
  };

  const removeIngredientField = (index) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to create a recipe.');
      navigate('/login');
      return;
    }

    // Basic validation (more can be added)
    if (!formData.name || !formData.cookingTime || !formData.servings || !formData.instructions) {
      setError('Please fill in all required fields: Name, Cooking Time, Servings, Instructions.');
      return;
    }
    
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'ingredients') {
        data.append(key, JSON.stringify(formData[key])); // Stringify ingredients array
      } else if (key === 'tags') {
        const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        // Backend expects tags as an array of strings, FormData appends 'tags[]' for each
        tagsArray.forEach(tag => data.append('tags', tag)); // Send as multiple 'tags' fields for array
      } else {
        data.append(key, formData[key]);
      }
    });

    if (imageFile) {
      data.append('recipeImage', imageFile); // 'recipeImage' must match backend multer field name
    } else if (formData.image) { // If an existing image URL was somehow part of formData (though not in current form)
      data.append('image', formData.image);
    }


    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          // 'Content-Type': 'application/json', // REMOVE THIS for FormData
          'Authorization': `Bearer ${token}`,
        },
        body: data, // Send FormData object
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create recipe');
      }

      setSuccess('Recipe created successfully! Redirecting...');
      // Optionally clear form: setFormData({ name: '', ...});
      setTimeout(() => {
        navigate('/'); // Or navigate to the new recipe's page: /recipes/${result._id}
      }, 2000);

    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
      console.error("Create recipe error:", err);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold text-center mb-8">Create New Recipe</h1>
      
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
      {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Recipe Name</label>
          <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required 
                 className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows="3"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="cookingTime" className="block text-sm font-medium text-gray-700">Cooking Time (e.g., 30 minutes)</label>
            <input type="text" name="cookingTime" id="cookingTime" value={formData.cookingTime} onChange={handleChange} required
                   className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="servings" className="block text-sm font-medium text-gray-700">Servings</label>
            <input type="number" name="servings" id="servings" value={formData.servings} onChange={handleChange} required min="1"
                   className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>
        <div>
          <label htmlFor="instructions" className="block text-sm font-medium text-gray-700">Instructions</label>
          <RichTextEditor
            value={formData.instructions}
            onChange={handleInstructionsChange}
            placeholder="Write your recipe steps here..."
          />
          {/* Basic validation for instructions is still in handleSubmit */}
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category (e.g., Breakfast, Vegan)</label>
          <input type="text" name="category" id="category" value={formData.category} onChange={handleChange}
                 className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Tags (comma-separated, e.g., quick, healthy, spicy)</label>
          <input type="text" name="tags" id="tags" value={formData.tags} onChange={handleChange}
                 className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>

        {/* Ingredients Section */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Ingredients</label>
          {formData.ingredients.map((ingredient, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 border rounded-md">
              <input
                type="text"
                name="quantity"
                placeholder="Qty"
                value={ingredient.quantity}
                onChange={(e) => handleIngredientChange(index, e)}
                className="w-1/5 px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"
              />
              <input
                type="text"
                name="unit"
                placeholder="Unit"
                value={ingredient.unit}
                onChange={(e) => handleIngredientChange(index, e)}
                className="w-1/5 px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"
              />
              <input
                type="text"
                name="name"
                placeholder="Ingredient Name"
                value={ingredient.name}
                onChange={(e) => handleIngredientChange(index, e)}
                required
                className="flex-grow px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"
              />
              <button
                type="button"
                onClick={() => removeIngredientField(index)}
                className="text-red-500 hover:text-red-700 font-semibold"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addIngredientField}
            className="mt-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Add Ingredient
          </button>
        </div>

        <div>
          <label htmlFor="recipeImage" className="block text-sm font-medium text-gray-700">Recipe Image</label>
          <input type="file" name="recipeImage" id="recipeImage" onChange={handleImageChange} accept="image/*"
                 className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
        </div>

        {/* isPublic Toggle */}
        <div className="flex items-center">
          <input
            id="isPublic"
            name="isPublic"
            type="checkbox"
            checked={formData.isPublic}
            onChange={handleChange}
            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
            Make this recipe public?
          </label>
        </div>

        <div className="flex items-center justify-end">
          <button type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
            Create Recipe
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateRecipePage;
