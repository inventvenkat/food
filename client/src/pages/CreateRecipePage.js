import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RichTextEditor from '../components/RichTextEditor';
import { Button, Card, Input, Textarea, Alert } from '../components/ui';

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

  const [recipeTextInput, setRecipeTextInput] = useState('');
  const [isParsingWithAI, setIsParsingWithAI] = useState(false);

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

  const handleParseWithAI = async () => {
    if (!recipeTextInput.trim()) {
      setError('Please enter recipe text first.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsParsingWithAI(true);
    setError('');
    setSuccess('');

    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to use AI parsing.');
      setIsParsingWithAI(false);
      return;
    }

    try {
      const response = await fetch('/api/recipes/parse-with-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ recipeText: recipeTextInput }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to parse recipe with AI');
      }

      if (result.success && result.data) {
        handleRecipeDetailsExtracted(result.data);
        
        let message = 'Recipe parsed successfully! ';
        if (result.source === 'ai') {
          message += 'Used AI model for parsing.';
        } else if (result.source === 'fallback') {
          message += 'AI parsing failed, used fallback parser.';
        }
        
        setSuccess(message);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        throw new Error('Invalid response from AI parsing');
      }

    } catch (err) {
      console.error('AI parsing error:', err);
      setError(err.message || 'Failed to parse recipe. Please try again or fill the form manually.');
      setTimeout(() => setError(''), 7000);
    } finally {
      setIsParsingWithAI(false);
    }
  };

  const handleClearForm = () => {
    setFormData({
      name: '',
      description: '',
      cookingTime: '',
      servings: '',
      instructions: '',
      category: '',
      tags: '',
      ingredients: [{ name: '', quantity: '1', unit: '' }],
      isPublic: false,
    });
    setRecipeTextInput('');
    setSuccess('Form cleared! You can start fresh.');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container-app max-w-4xl mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="heading-xl mb-4">Create New Recipe</h1>
          <p className="body-lg text-neutral-600 max-w-2xl mx-auto">
            Share your culinary creations with the world. Use our AI-powered assistant to help format your recipes perfectly.
          </p>
        </div>

        {error && <Alert variant="error" className="mb-6">{error}</Alert>}
        {success && <Alert variant="success" className="mb-6">{success}</Alert>}

        {/* AI-Assisted Recipe Parsing */}
        <Card className="mb-8">
          <Card.Header>
            <Card.Title className="flex items-center space-x-2">
              <span className="text-2xl">🤖</span>
              <span>AI-Powered Recipe Assistant</span>
            </Card.Title>
            <p className="body-base text-neutral-600">
              Have a recipe in text format? Our AI assistant will automatically parse and format it for you. 
              Just paste your recipe text and click the button below. You can also skip this and fill the form manually.
            </p>
          </Card.Header>
          
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-primary-50 rounded-xl">
                <div className="text-2xl mb-2">📝</div>
                <h3 className="font-semibold text-primary-800 mb-1">Step 1</h3>
                <p className="text-sm text-primary-700">Paste your recipe text</p>
              </div>
              <div className="text-center p-4 bg-secondary-50 rounded-xl">
                <div className="text-2xl mb-2">✨</div>
                <h3 className="font-semibold text-secondary-800 mb-1">Step 2</h3>
                <p className="text-sm text-secondary-700">AI automatically parses and fills form</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <Textarea
                label="Recipe Text"
                placeholder="Paste your recipe text here... (ingredients, instructions, cooking time, etc.)"
                value={recipeTextInput}
                onChange={(e) => setRecipeTextInput(e.target.value)}
                rows={8}
                helper="Paste any recipe text - our AI will extract ingredients, instructions, cooking time, and other details automatically."
              />
              
              <Button
                onClick={handleParseWithAI}
                className="w-full md:w-auto"
                disabled={!recipeTextInput.trim() || isParsingWithAI}
              >
                {isParsingWithAI ? (
                  <>🤖 Parsing with AI...</>
                ) : (
                  <>🤖 Parse Recipe with AI</>
                )}
              </Button>
            </div>
          </Card.Content>
        </Card>

        <div className="flex items-center my-8">
          <div className="flex-1 border-t border-neutral-300"></div>
          <span className="px-4 text-neutral-500 text-sm font-medium">or create recipe manually</span>
          <div className="flex-1 border-t border-neutral-300"></div>
        </div>

        <Card>
          <Card.Header>
            <Card.Title className="flex items-center space-x-2">
              <span className="text-2xl">📝</span>
              <span>Manual Recipe Creation</span>
            </Card.Title>
            <p className="body-base text-neutral-600">
              Prefer to create your recipe from scratch? Fill in each field manually below. 
              Required fields are marked with an asterisk. You can always use the AI assistant above to auto-fill this form.
            </p>
          </Card.Header>
          
          <Card.Content>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Recipe Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter a delicious name for your recipe"
              />
              
              <Textarea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Briefly describe your recipe and what makes it special"
                helper="This will help others understand what your recipe is about"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Cooking Time"
                  name="cookingTime"
                  value={formData.cookingTime}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 30 minutes"
                />
                <Input
                  label="Servings"
                  name="servings"
                  type="number"
                  value={formData.servings}
                  onChange={handleChange}
                  required
                  min="1"
                  placeholder="How many people does this serve?"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700">
                  Instructions <span className="text-error">*</span>
                </label>
                <div className="border border-neutral-300 rounded-xl overflow-hidden">
                  <RichTextEditor
                    value={formData.instructions}
                    onChange={handleInstructionsChange}
                    placeholder="Write your recipe steps here..."
                  />
                </div>
                <p className="text-sm text-neutral-500">
                  Use the rich text editor to format your instructions with lists, bold text, and more.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="e.g., Breakfast, Vegan, Dessert"
                  helper="Help others find your recipe"
                />
                <Input
                  label="Tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="quick, healthy, spicy"
                  helper="Comma-separated keywords"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-neutral-700">
                    Ingredients <span className="text-error">*</span>
                  </label>
                  <Button
                    type="button"
                    onClick={addIngredientField}
                    variant="ghost"
                    size="sm"
                  >
                    + Add Ingredient
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {formData.ingredients.map((ingredient, index) => (
                    <Card key={index} className="!p-4">
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-12 sm:col-span-2">
                          <Input
                            placeholder="Qty"
                            name="quantity"
                            value={ingredient.quantity}
                            onChange={(e) => handleIngredientChange(index, e)}
                            size="sm"
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-2">
                          <Input
                            placeholder="Unit"
                            name="unit"
                            value={ingredient.unit}
                            onChange={(e) => handleIngredientChange(index, e)}
                            size="sm"
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-6">
                          <Input
                            placeholder="Ingredient name"
                            name="name"
                            value={ingredient.name}
                            onChange={(e) => handleIngredientChange(index, e)}
                            required
                            size="sm"
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-2">
                          <Button
                            type="button"
                            onClick={() => removeIngredientField(index)}
                            variant="ghost"
                            size="sm"
                            className="text-error hover:text-error hover:bg-red-50 w-full"
                            disabled={formData.ingredients.length === 1}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                
                {formData.ingredients.length === 0 && (
                  <div className="text-center py-8 text-neutral-500">
                    <p>No ingredients added yet. Click "Add Ingredient" to get started!</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700">
                  Recipe Image
                </label>
                <input
                  type="file"
                  name="recipeImage"
                  onChange={handleImageChange}
                  accept="image/*"
                  className="file-input-style"
                />
                <p className="text-sm text-neutral-500">
                  Upload a beautiful photo of your finished dish (optional)
                </p>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-primary-50 rounded-xl border border-primary-200">
                <input
                  id="isPublic"
                  name="isPublic"
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                />
                <div>
                  <label htmlFor="isPublic" className="font-medium text-primary-900">
                    Share with the community
                  </label>
                  <p className="text-sm text-primary-700 mt-1">
                    Make this recipe public so others can discover and enjoy it. You can change this anytime.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-neutral-200">
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={handleClearForm}
                  className="text-neutral-600 hover:text-neutral-800"
                >
                  🗑️ Clear Form
                </Button>
                <div className="flex-1"></div>
                <Button
                  type="submit"
                  size="lg"
                >
                  🍳 Create Recipe
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default CreateRecipePage;
