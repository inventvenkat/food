import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
// CSS is now imported in index.css
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

const localizer = momentLocalizer(moment);

const MealPlannerPage = () => {
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');
  const [isControlsOpen, setIsControlsOpen] = useState(false); // State for collapsible section

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlotInfo, setSelectedSlotInfo] = useState(null);
  const [userRecipes, setUserRecipes] = useState([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('Breakfast');
  const [modalPlannedServings, setModalPlannedServings] = useState(1);

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [mealPlanEntryToDelete, setMealPlanEntryToDelete] = useState(null);

  const [shoppingListStartDate, setShoppingListStartDate] = useState(moment().startOf('week').format('YYYY-MM-DD'));
  const [shoppingListEndDate, setShoppingListEndDate] = useState(moment().endOf('week').format('YYYY-MM-DD'));

  // States for copy meal plan feature
  const [copySourceStart, setCopySourceStart] = useState(moment().startOf('week').format('YYYY-MM-DD'));
  const [copySourceEnd, setCopySourceEnd] = useState(moment().endOf('week').format('YYYY-MM-DD'));
  const [copyDestStart, setCopyDestStart] = useState(moment().add(1, 'week').startOf('week').format('YYYY-MM-DD'));
  const [copyStatus, setCopyStatus] = useState(''); // For success/error messages from copy operation

  const fetchMealPlans = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required.');
      navigate('/login');
      return;
    }
    try {
      const response = await fetch('/api/mealplans', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch meal plans.');
      const data = await response.json();
      const events = data.map(plan => {
        if (!plan.recipe) { // If recipe was deleted and populate returned null
          return {
            id: plan._id,
            title: `${plan.mealType}: (Deleted Recipe)`, // Display a placeholder
            start: new Date(plan.date),
            end: new Date(plan.date),
            allDay: true,
            // Provide a minimal resource object so event handlers don't break
            resource: { ...plan, recipe: { name: "(Deleted Recipe)", _id: null } } 
          };
        }
        // Existing logic for when recipe exists
        return {
          id: plan._id,
          title: `${plan.mealType}: ${plan.recipe.name} (${plan.plannedServings} serv.)`,
          start: new Date(plan.date),
          end: new Date(plan.date),
          allDay: true,
          resource: plan,
        };
      });
      setMyEvents(events);
    } catch (err) {
      setError(err.message);
      console.error("Fetch Meal Plans error:", err);
    }
  }, [navigate]);

  const fetchUserRecipes = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await fetch('/api/recipes', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch user recipes.');
      const data = await response.json();
      setUserRecipes(data);
    } catch (err) {
      console.error("Fetch User Recipes error:", err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMealPlans(), fetchUserRecipes()]).finally(() => setLoading(false));
  }, [fetchMealPlans, fetchUserRecipes]);

  const handleSelectSlot = useCallback(
    ({ start, end, slots }) => {
      const dateForEntry = slots && slots.length > 0 ? slots[0] : start;
      setSelectedSlotInfo({ date: dateForEntry });
      setSelectedRecipeId('');
      setSelectedMealType('Breakfast');
      setModalPlannedServings(1);
      setShowAddModal(true);
    },
    [] 
  );
  
  const handleRecipeSelectionChange = (recipeId) => {
    setSelectedRecipeId(recipeId);
    const selectedRecipe = userRecipes.find(r => r._id === recipeId);
    if (selectedRecipe && selectedRecipe.servings) {
      setModalPlannedServings(selectedRecipe.servings);
    } else {
      setModalPlannedServings(1);
    }
  };

  const handleAddMealPlanEntry = async () => {
    if (!selectedSlotInfo || !selectedRecipeId || !selectedMealType || modalPlannedServings < 1) {
      alert('Please select a recipe, meal type, and specify valid servings.');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/mealplans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: moment(selectedSlotInfo.date).toISOString(),
          mealType: selectedMealType,
          recipeId: selectedRecipeId,
          plannedServings: modalPlannedServings,
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to add meal plan entry.');
      }
      setShowAddModal(false);
      fetchMealPlans(); 
      alert('Meal plan entry added successfully!');
    } catch (err) {
      console.error("Add Meal Plan Entry error:", err);
      alert(`Error: ${err.message}`);
    }
  };

  const confirmDeleteMealPlanEntry = useCallback(async () => {
    if (!mealPlanEntryToDelete || !mealPlanEntryToDelete.id) return;
    const token = localStorage.getItem('token');
    if (!token) { setError('Authentication required.'); navigate('/login'); return; }
    try {
      const response = await fetch(`/api/mealplans/${mealPlanEntryToDelete.id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` },
      });
      const responseText = await response.text();
      if (!response.ok) {
        let errorMessage = `Failed to delete: ${response.status}`;
        try { const errData = JSON.parse(responseText); errorMessage = errData.message || errorMessage; } catch (e) { if(responseText) errorMessage = responseText; }
        throw new Error(errorMessage);
      }
      fetchMealPlans(); 
      alert('Meal plan entry removed successfully!');
    } catch (err) {
      console.error("Delete Meal Plan Entry error:", err.message);
      alert(`Error: ${err.message}`); setError(err.message);
    } finally {
      setShowDeleteConfirmModal(false); setMealPlanEntryToDelete(null);
    }
  }, [fetchMealPlans, navigate, mealPlanEntryToDelete]);
  
  const handleSelectEvent = useCallback(
    (event) => {
      if (event.id && event.title) { 
        setMealPlanEntryToDelete({ id: event.id, title: event.title });
        setShowDeleteConfirmModal(true);
      } else {
        alert(`Clicked: ${event.title}. No ID found for deletion options.`);
      }
    },
    [] 
  );

  const handleGenerateShoppingListFromPlan = () => {
    if (!shoppingListStartDate || !shoppingListEndDate) {
      alert('Please select a valid start and end date for the shopping list.'); return;
    }
    if (moment(shoppingListEndDate).isBefore(moment(shoppingListStartDate))) {
      alert('End date cannot be before start date.'); return;
    }
    navigate(`/shopping-list?startDate=${shoppingListStartDate}&endDate=${shoppingListEndDate}`);
  };

  const handleCopyMealPlan = async () => {
    if (!copySourceStart || !copySourceEnd || !copyDestStart) {
      setCopyStatus('Error: All source and destination dates must be selected.'); return;
    }
    if (moment(copySourceEnd).isBefore(moment(copySourceStart))) {
      setCopyStatus('Error: Source end date cannot be before source start date.'); return;
    }
    const token = localStorage.getItem('token');
    if (!token) { setCopyStatus('Error: Authentication required.'); navigate('/login'); return; }

    setCopyStatus('Copying...');
    try {
      const response = await fetch('/api/mealplans/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          sourceStartDate: copySourceStart, 
          sourceEndDate: copySourceEnd, 
          destinationStartDate: copyDestStart 
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to copy meal plan.');
      setCopyStatus(result.message || 'Meal plan copied successfully!');
      fetchMealPlans(); // Refresh calendar
    } catch (err) {
      console.error("Copy Meal Plan error:", err);
      setCopyStatus(`Error: ${err.message}`);
    }
  };

  if (loading) return <div className="text-center p-10">Loading Meal Planner...</div>;
  if (error) return <div className="text-center p-10 text-red-600">Error: {error}</div>;

  const toggleControls = () => setIsControlsOpen(!isControlsOpen);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6">Meal Planner</h1>

      <div className="mb-4">
        <button 
          onClick={toggleControls} 
          className="w-full btn-secondary py-2 px-4 rounded-md flex items-center justify-center text-sm font-medium"
        >
          {isControlsOpen ? 'Hide Planner Tools' : 'Show Planner Tools'}
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ml-2 transform transition-transform ${isControlsOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isControlsOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 bg-gray-100 rounded-lg shadow">
          <div className="p-4 bg-white rounded-lg shadow-inner"> {/* Changed bg-gray-50 to bg-white for contrast */}
            <h2 className="text-xl font-semibold mb-3 text-gray-700">Generate Shopping List</h2>
            <div className="space-y-3">
            <div><label htmlFor="shoppingListStartDate" className="block text-sm font-medium text-gray-700">Start Date:</label><input type="date" id="shoppingListStartDate" value={shoppingListStartDate} onChange={(e) => setShoppingListStartDate(e.target.value)} className="mt-1 input-style w-full"/></div>
            <div><label htmlFor="shoppingListEndDate" className="block text-sm font-medium text-gray-700">End Date:</label><input type="date" id="shoppingListEndDate" value={shoppingListEndDate} onChange={(e) => setShoppingListEndDate(e.target.value)} className="mt-1 input-style w-full"/></div>
            <button onClick={handleGenerateShoppingListFromPlan} className="btn-primary w-full">Get Shopping List</button>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3 text-gray-700">Copy Meal Plan</h2>
          <div className="space-y-3">
            <div><label htmlFor="copySourceStart" className="block text-sm font-medium text-gray-700">Copy From (Start Date):</label><input type="date" id="copySourceStart" value={copySourceStart} onChange={(e) => setCopySourceStart(e.target.value)} className="mt-1 input-style w-full"/></div>
            <div><label htmlFor="copySourceEnd" className="block text-sm font-medium text-gray-700">Copy From (End Date):</label><input type="date" id="copySourceEnd" value={copySourceEnd} onChange={(e) => setCopySourceEnd(e.target.value)} className="mt-1 input-style w-full"/></div>
            <div><label htmlFor="copyDestStart" className="block text-sm font-medium text-gray-700">Paste To (Start Date):</label><input type="date" id="copyDestStart" value={copyDestStart} onChange={(e) => setCopyDestStart(e.target.value)} className="mt-1 input-style w-full"/></div>
            <button onClick={handleCopyMealPlan} className="btn-primary w-full">Copy Plan</button>
          </div>
          {copyStatus && <p className={`mt-2 text-sm ${copyStatus.startsWith('Error:') ? 'text-red-600' : 'text-green-600'}`}>{copyStatus}</p>}
        </div>
        </div>
      )}

      <div style={{ height: '70vh' }} className="bg-white p-4 shadow-lg rounded-lg">
        <Calendar
          localizer={localizer} events={myEvents} startAccessor="start" endAccessor="end"
          style={{ height: '100%' }} selectable onSelectSlot={handleSelectSlot} onSelectEvent={handleSelectEvent} 
          date={currentDate} view={currentView} onNavigate={(date) => setCurrentDate(date)} onView={(view) => setCurrentView(view)}
          views={['month', 'week', 'day']}
        />
      </div>
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Meal to Plan">
        <div className="space-y-4">
          <div><label htmlFor="mealDate" className="block text-sm font-medium text-gray-700">Date</label><input type="text" id="mealDate" readOnly value={selectedSlotInfo ? moment(selectedSlotInfo.date).format('LL') : ''} className="mt-1 block w-full input-style"/></div>
          <div><label htmlFor="mealTypeSelect" className="block text-sm font-medium text-gray-700">Meal Type</label><select id="mealTypeSelect" value={selectedMealType} onChange={(e) => setSelectedMealType(e.target.value)} className="mt-1 block w-full select-style"><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option></select></div>
          <div><label htmlFor="recipeSelect" className="block text-sm font-medium text-gray-700">Recipe</label><select id="recipeSelect" value={selectedRecipeId} onChange={(e) => handleRecipeSelectionChange(e.target.value)} className="mt-1 block w-full select-style"><option value="">-- Select a Recipe --</option>{userRecipes.map(recipe => (<option key={recipe._id} value={recipe._id}>{recipe.name} (Serves {recipe.servings || 'N/A'})</option>))}</select></div>
          <div><label htmlFor="plannedServings" className="block text-sm font-medium text-gray-700">Servings for this meal</label><input type="number" id="plannedServings" name="plannedServings" value={modalPlannedServings} onChange={(e) => setModalPlannedServings(parseInt(e.target.value, 10) || 1)} min="1" required className="mt-1 block w-full input-style"/></div>
          <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button><button type="button" onClick={handleAddMealPlanEntry} className="btn-primary">Add to Plan</button></div>
        </div>
      </Modal>
      {mealPlanEntryToDelete && (
        <Modal isOpen={showDeleteConfirmModal} onClose={() => { setShowDeleteConfirmModal(false); setMealPlanEntryToDelete(null); }} title="Confirm Deletion">
          <div>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to remove "{mealPlanEntryToDelete.title}" from your meal plan?</p>
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={() => { setShowDeleteConfirmModal(false); setMealPlanEntryToDelete(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">Cancel</button>
              <button type="button" onClick={confirmDeleteMealPlanEntry} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Delete</button>
            </div>
          </div>
        </Modal>
      )}
      {/* 
        Removed style jsx global block. 
        CSS classes like .input-style, .select-style, .btn-primary, .btn-secondary 
        should be defined globally (e.g., in index.css using @layer components) 
        or applied directly using Tailwind utility classes on each element.
        The buttons in this file already use direct Tailwind classes or btn-primary/btn-secondary which should be defined globally.
      */}
    </div>
  );
};

export default MealPlannerPage;
