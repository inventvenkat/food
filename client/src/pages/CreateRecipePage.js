import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RichTextEditor from '../components/RichTextEditor';
// import RecipeUpload from '../components/RecipeUpload'; // Option 1 removed

const CreateRecipePage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cookingTime: '',
    servings: '',
    instructions: '',
    category: '',
    tags: '', // Will be string from form, converted to array for LLM/backend if needed
    ingredients: [{ name: '', quantity: '1', unit: '' }],
    isPublic: false,
  });
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [llmPrompt, setLlmPrompt] = useState('');
  const [llmJsonOutput, setLlmJsonOutput] = useState('');

  const handleRecipeDetailsExtracted = (parsedRecipeData) => {
    console.log("Data received by handleRecipeDetailsExtracted:", parsedRecipeData); // DEBUG LOG

    const {
        title,
        description,
        ingredients: extractedIngredients,
        cookingTime,
        servings,
        instructions,
        category,
        tags // Expecting tags as an array from LLM
    } = parsedRecipeData;

    console.log("Destructured - title:", title); // DEBUG LOG
    console.log("Destructured - description:", description); // DEBUG LOG
    console.log("Destructured - cookingTime:", cookingTime); // DEBUG LOG
    console.log("Destructured - servings:", servings); // DEBUG LOG
    console.log("Destructured - instructions:", instructions); // DEBUG LOG
    console.log("Destructured - category:", category); // DEBUG LOG
    console.log("Destructured - tags:", tags); // DEBUG LOG
    console.log("Destructured - extractedIngredients:", extractedIngredients); // DEBUG LOG

    const newIngredients = (extractedIngredients || []).map(ingObj => ({
      name: ingObj.name || '',
      quantity: ingObj.quantity || '1',
      unit: ingObj.unit || ''
    }));

    setFormData(prev => {
      console.log("Previous formData:", prev); // DEBUG LOG

      let processedServings = prev.servings; // Default to previous value
      if (servings) {
        const servingsMatch = String(servings).match(/\d+/); // Extract first number
        if (servingsMatch) {
          processedServings = servingsMatch[0];
        } else {
          processedServings = ''; // Or keep prev.servings if no number found
        }
      } else if (servings === null || servings === '') { // Explicitly cleared by LLM
        processedServings = '';
      }


      const newState = {
        ...prev,
        name: title || prev.name,
        description: description || prev.description,
        cookingTime: cookingTime || prev.cookingTime,
        servings: processedServings, // Use processed servings
        instructions: instructions || prev.instructions,
        category: category || prev.category,
        tags: Array.isArray(tags) ? tags.join(', ') : (tags || prev.tags),
        ingredients: newIngredients.length > 0 ? newIngredients : [{ name: '', quantity: '1', unit: '' }]
      };
      console.log("New formData to be set:", newState); // DEBUG LOG
      return newState;
    });

    let messageParts = [];
    if (title) messageParts.push("Title");
    if (description) messageParts.push("description");
    if (cookingTime) messageParts.push("cooking time");
    if (servings) messageParts.push("servings");
    if (newIngredients && newIngredients.length > 0) messageParts.push("ingredients");
    if (instructions) messageParts.push("instructions");
    if (category) messageParts.push("category");
    if (tags && tags.length > 0) messageParts.push("tags");

    let message = "";
    if (messageParts.length === 0) {
        message = "Could not extract significant details. Please fill the form manually.";
    } else {
        message = `${messageParts.join(', ')} extracted! Please review and adjust as needed.`;
    }
    setSuccess(message);
    setTimeout(() => setSuccess(''), 5000);
  };

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

    if (!formData.name || !formData.cookingTime || !formData.servings || !formData.instructions) {
      setError('Please fill in all required fields: Name, Cooking Time, Servings, Instructions.');
      return;
    }

    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'ingredients') {
        data.append(key, JSON.stringify(formData[key]));
      } else if (key === 'tags') {
        data.append(key, formData.tags);
      } else {
        data.append(key, formData[key]);
      }
    });

    if (imageFile) {
      data.append('recipeImage', imageFile);
    } else if (formData.image) {
      data.append('image', formData.image);
    }

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: data,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create recipe');
      }

      setSuccess('Recipe created successfully! Redirecting...');
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
      console.error("Create recipe error:", err);
    }
  };

  const handleGenerateLlmPrompt = () => {
    const jsonStructure = {
      title: "string | null",
      description: "string | null",
      cookingTime: "string | null",
      servings: "string | null",
      category: "string | null",
      tags: ["string", "string"],
      ingredients: [
        { quantity: "string | null", unit: "string | null", name: "string" }
      ],
      instructions: "string | null"
    };
    const prompt = `Please parse the recipe text that I will provide to you (e.g., by pasting or uploading a file directly to you) and reformat it into the JSON structure specified below. Ensure all fields are populated as accurately as possible. If a field cannot be determined, use an empty string "" or null for that field, or an empty array [] for ingredients and tags.

JSON Structure to use:
${JSON.stringify(jsonStructure, null, 2)}

Your JSON Output (ensure it's a single, valid JSON object):
\`\`\`json
[LLM should output the JSON here]
\`\`\`
`;
    setLlmPrompt(prompt);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(prompt)
        .then(() => {
          setSuccess('LLM formatting instructions copied to clipboard! Paste them into your LLM, then provide your recipe text/file.');
          setTimeout(() => setSuccess(''), 7000);
        })
        .catch(err => {
          console.error('Failed to copy text to clipboard:', err);
          setError('Failed to copy to clipboard. Please copy manually from the text area below.');
          setTimeout(() => setError(''), 5000);
        });
    } else {
      setError('Clipboard API not available. Please copy manually from the text area below.');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleFillFormFromLlmJson = () => {
    if (!llmJsonOutput.trim()) {
      setError('Please paste the JSON output from your LLM first.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    try {
      let cleanedJson = llmJsonOutput.replace(/^```json\s*|```$/g, '').trim();
      console.log("Raw LLM JSON Output (cleaned):", cleanedJson); // DEBUG LOG
      const parsedData = JSON.parse(cleanedJson);
      console.log("Parsed LLM Data (JavaScript Object):", parsedData); // DEBUG LOG

      handleRecipeDetailsExtracted(parsedData);

      setSuccess('Form populated from LLM output! Please review.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      console.error("Error parsing LLM JSON:", e);
      setError('Invalid JSON format from LLM. Please ensure it is valid JSON. Error: ' + e.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold text-center mb-8">Create New Recipe</h1>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
      {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{success}</div>}

      {/* Section for LLM-Assisted Parsing */}
      <div className="mb-8 p-4 border border-gray-200 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">Parse with your LLM</h2>
        <p className="text-sm text-gray-600 mb-3">
          Use your preferred LLM (like ChatGPT, Claude, etc.) to parse your recipe.
          First, get the formatting instructions. Then, in your LLM, paste these instructions
          and provide your recipe text or upload your recipe file. Finally, paste the LLM's JSON output below.
        </p>
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGenerateLlmPrompt}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            1. Copy LLM Formatting Instructions
          </button>
          {llmPrompt && (
            <div>
              <label htmlFor="llmPrompt" className="block text-sm font-medium text-gray-700">
                2. Instructions for LLM (also copied to clipboard):
              </label>
              <textarea
                id="llmPrompt"
                name="llmPrompt"
                rows="12"
                readOnly
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={llmPrompt}
              />
            </div>
          )}
          <div>
            <label htmlFor="llmJsonOutput" className="block text-sm font-medium text-gray-700">
              3. Paste JSON Output from LLM Here:
            </label>
            <textarea
              id="llmJsonOutput"
              name="llmJsonOutput"
              rows="8"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Paste the JSON output from your LLM here..."
              value={llmJsonOutput}
              onChange={(e) => setLlmJsonOutput(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={handleFillFormFromLlmJson}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            4. Fill Form from LLM JSON
          </button>
        </div>
      </div>

      <hr className="my-8" />

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
          {console.log("RichTextEditor value prop:", formData.instructions)} {/* DEBUG LOG */}
          <RichTextEditor
            value={formData.instructions}
            onChange={handleInstructionsChange}
            placeholder="Write your recipe steps here..."
          />
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
