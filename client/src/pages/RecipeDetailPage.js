import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const RecipeDetailPage = () => {
  const { id: recipeId } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  // State for Text-to-Speech
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [speechError, setSpeechError] = useState('');


  useEffect(() => {
    // Cleanup speech synthesis on component unmount or when recipeId changes
    return () => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeechError('');
    };
  }, [recipeId]);

  useEffect(() => {
    // Get current user ID from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.user.id);
      } catch (e) {
        console.error("Failed to parse token for user ID", e);
      }
    }

    const fetchRecipeDetails = async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      try {
        let response;
        // Try fetching as an owned recipe first if logged in
        if (token) {
          response = await fetch(`/api/recipes/${recipeId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
        }

        // If not found as owned (or not logged in), try fetching as a public recipe
        if (!token || (response && (response.status === 404 || response.status === 401))) {
          console.log('Attempting to fetch as public recipe...');
          response = await fetch(`/api/recipes/public/${recipeId}`);
        }

        if (!response || !response.ok) {
          let errData = {};
          try {
            errData = await response.json();
          } catch(e) { /* ignore if response is not json */ }
          throw new Error(errData.message || `Failed to fetch recipe (status: ${response ? response.status : 'unknown'})`);
        }

        const data = await response.json();
        setRecipe(data);

      } catch (err) {
        setError(err.message);
        console.error("Fetch recipe detail error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (recipeId) {
      fetchRecipeDetails();
    } else {
      setError('No recipe ID provided.');
      setLoading(false);
    }
  }, [recipeId, navigate]);

  const handleTogglePublicStatus = async () => {
    // Corrected ownership check, consistent with the one used for displaying buttons
    const isOwner = recipe && recipe.authorId && currentUserId && recipe.authorId === `USER#${currentUserId}`;

    if (!recipe || !isOwner) {
      alert("You can only change the status of your own recipes.");
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required.');
      return;
    }
    try {
      const newPublicStatus = !recipe.isPublic;
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublic: newPublicStatus }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to update public status.');
      }
      const updatedRecipe = await response.json();
      setRecipe(updatedRecipe); // Update local state
      alert(`Recipe status changed to ${newPublicStatus ? 'Public' : 'Private'}.`);
    } catch (err) {
      setError(err.message);
      console.error("Toggle public status error:", err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required to delete.');
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to delete recipe');
      }

      alert('Recipe deleted successfully.');
      navigate('/my-recipes'); // Navigate back to the list of recipes

    } catch (err) {
      setError(err.message);
      console.error("Delete recipe error:", err);
      // Potentially show a more user-friendly error message on the page
    }
  };

  if (loading) return <div className="text-center p-10">Loading recipe details...</div>;
  if (error) return <div className="text-center p-10 text-red-600">Error: {error}</div>;
  if (!recipe) return <div className="text-center p-10">Recipe not found.</div>;

  // Determine if the current user is the owner of the recipe
  const isOwner = recipe && recipe.authorId && currentUserId && recipe.authorId === `USER#${currentUserId}`;
  // Debugging log for ownership
  // console.log(`[OWNERSHIP_DEBUG] Recipe Author ID: ${recipe ? recipe.authorId : 'N/A'}, Current User ID for check: USER#${currentUserId}, Is Owner: ${isOwner}`);

  const getRecipeTextForSpeech = () => {
    if (!recipe) return "";
    let text = `Recipe: ${recipe.name}.\n\n`;
    if (recipe.description) {
      text += `Description: ${recipe.description}.\n\n`;
    }
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      text += "Ingredients:\n";
      recipe.ingredients.forEach(ing => {
        text += `${ing.quantity || ''} ${ing.unit || ''} ${ing.name}.\n`;
      });
      text += "\n";
    }
    if (recipe.instructions) {
      text += "Instructions:\n";
      // Strip HTML from instructions for speech
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = recipe.instructions;
      text += tempDiv.textContent || tempDiv.innerText || "";
      text += "\n";
    }
    return text;
  };

  const handlePlayPauseAudio = () => {
    if (!window.speechSynthesis) {
      setSpeechError("Your browser does not support speech synthesis.");
      return;
    }
    setSpeechError('');

    if (isSpeaking) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    } else {
      const recipeText = getRecipeTextForSpeech();
      if (!recipeText.trim()) {
        setSpeechError("No content to read.");
        return;
      }
      const utterance = new SpeechSynthesisUtterance(recipeText);
      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };
      utterance.onerror = (event) => {
        console.error("Speech synthesis error", event);
        setSpeechError(`Speech error: ${event.error}`);
        setIsSpeaking(false);
        setIsPaused(false);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStopAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeechError('');
  };


  // Debugging logs for button visibility
  console.log("RecipeDetailPage: currentUserId:", currentUserId);
  console.log("RecipeDetailPage: recipe.user:", recipe ? recipe.user : "no recipe.user");
  if (recipe && recipe.user) {
    console.log("RecipeDetailPage: recipe.user._id:", recipe.user._id);
    console.log("RecipeDetailPage: Ownership check (recipe.user._id === currentUserId):", recipe.user._id === currentUserId);
  }


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        {recipe.image && (
          <img src={recipe.image} alt={recipe.name} className="w-full h-64 sm:h-80 md:h-96 object-cover" />
        )}
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 flex-grow">{recipe.name}</h1>
            {/* TTS Controls */}
            <div className="flex space-x-2 flex-shrink-0 ml-4">
              <button
                onClick={handlePlayPauseAudio}
                className={`px-3 py-2 rounded-md text-white font-semibold text-sm transition-colors ${
                  isSpeaking && !isPaused ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-500 hover:bg-blue-600'
                }`}
                title={isSpeaking && !isPaused ? "Pause Audio" : (isPaused ? "Resume Audio" : "Play Audio")}
              >
                {isSpeaking && !isPaused ? 'Pause' : (isPaused ? 'Resume' : 'Play Audio')}
              </button>
              {isSpeaking && (
                <button
                  onClick={handleStopAudio}
                  className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm rounded-md transition-colors"
                  title="Stop Audio"
                >
                  Stop
                </button>
              )}
            </div>
          </div>
          {speechError && <p className="text-red-500 text-sm mb-2">{speechError}</p>}

          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6 items-center">
            {recipe.category && <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">Category: {recipe.category}</span>}
            {recipe.cookingTime && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">Time: {recipe.cookingTime}</span>}
            {recipe.servings && <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">Servings: {recipe.servings}</span>}
            <span className={`px-3 py-1 rounded-full ${recipe.isPublic ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
              {recipe.isPublic ? 'Public Recipe' : 'Private Recipe'}
            </span>
          </div>

          {recipe.description && (
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{recipe.description}</p>
            </div>
          )}

          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">Ingredients</h2>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {recipe.ingredients.map((ing, index) => (
                  <li key={index}>{ing.quantity} {ing.unit} {ing.name}</li>
                ))}
              </ul>
            </div>
          )}

          {recipe.instructions && (
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">Instructions</h2>
              {/* Assuming instructions are HTML from Tiptap */}
              <div className="prose prose-sm sm:prose lg:prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: recipe.instructions }} />
            </div>
          )}

          {recipe.tags && recipe.tags.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag, index) => (
                  <span key={index} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm">{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap gap-4">
            {isOwner && (
              <>
                <Link
                  to={`/edit-recipe/${recipe.recipeId}`}
                  className="btn-primary" // Using Tailwind apply classes from EditRecipePage for consistency
                >
                  Edit Recipe
                </Link>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Delete Recipe
                </button>
                <button
                  onClick={handleTogglePublicStatus}
                  className={`${recipe.isPublic ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline`}
                >
                  {recipe.isPublic ? 'Make Private' : 'Make Public'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailPage;
