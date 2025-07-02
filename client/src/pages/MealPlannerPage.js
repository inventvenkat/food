import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
// CSS is now imported in index.css
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

const localizer = momentLocalizer(moment);

const SidebarContent = ({ 
  showAddModal, 
  setShowAddModal, 
  setSelectedSlotInfo, 
  setSelectedRecipeId, 
  setSelectedMealType, 
  setModalPlannedServings,
  navigate,
  shoppingListStartDate,
  setShoppingListStartDate,
  shoppingListEndDate,
  setShoppingListEndDate,
  handleGenerateShoppingListFromPlan,
  copySourceStart,
  setCopySourceStart,
  copySourceEnd,
  setCopySourceEnd,
  copyDestStart,
  setCopyDestStart,
  handleCopyMealPlan,
  copyStatus
}) => (
  <div className="space-y-6">
    {/* Quick Actions */}
    <div className="card p-6">
      <h2 className="heading-sm text-neutral-900 mb-4">Quick Actions</h2>
      <div className="space-y-3">
        <button
          onClick={() => {
            setSelectedSlotInfo({ date: new Date() });
            setSelectedRecipeId('');
            setSelectedMealType('Breakfast');
            setModalPlannedServings(1);
            setShowAddModal(true);
          }}
          className="btn-primary btn-sm w-full flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Meal
        </button>
        <button
          onClick={() => navigate(`/shopping-list?startDate=${moment().format('YYYY-MM-DD')}&endDate=${moment().add(6, 'days').format('YYYY-MM-DD')}`)}
          className="btn-secondary btn-sm w-full flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          Week's Shopping List
        </button>
      </div>
    </div>

    {/* Shopping List Generator */}
    <div className="card p-6">
      <h2 className="heading-sm text-neutral-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Shopping List
      </h2>
      <div className="space-y-3">
        <div>
          <label htmlFor="shoppingListStartDate" className="block text-sm font-medium text-neutral-700 mb-1">Start Date</label>
          <input 
            type="date" 
            id="shoppingListStartDate" 
            value={shoppingListStartDate} 
            onChange={(e) => setShoppingListStartDate(e.target.value)} 
            className="input-style-sm w-full"
          />
        </div>
        <div>
          <label htmlFor="shoppingListEndDate" className="block text-sm font-medium text-neutral-700 mb-1">End Date</label>
          <input 
            type="date" 
            id="shoppingListEndDate" 
            value={shoppingListEndDate} 
            onChange={(e) => setShoppingListEndDate(e.target.value)} 
            className="input-style-sm w-full"
          />
        </div>
        <button 
          onClick={handleGenerateShoppingListFromPlan} 
          className="btn-primary btn-sm w-full"
        >
          Generate List
        </button>
      </div>
    </div>

    {/* Copy Meal Plan */}
    <div className="card p-6">
      <h2 className="heading-sm text-neutral-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copy Meal Plan
      </h2>
      <div className="space-y-3">
        <div>
          <label htmlFor="copySourceStart" className="block text-sm font-medium text-neutral-700 mb-1">From (Start)</label>
          <input 
            type="date" 
            id="copySourceStart" 
            value={copySourceStart} 
            onChange={(e) => setCopySourceStart(e.target.value)} 
            className="input-style-sm w-full"
          />
        </div>
        <div>
          <label htmlFor="copySourceEnd" className="block text-sm font-medium text-neutral-700 mb-1">From (End)</label>
          <input 
            type="date" 
            id="copySourceEnd" 
            value={copySourceEnd} 
            onChange={(e) => setCopySourceEnd(e.target.value)} 
            className="input-style-sm w-full"
          />
        </div>
        <div>
          <label htmlFor="copyDestStart" className="block text-sm font-medium text-neutral-700 mb-1">To (Start)</label>
          <input 
            type="date" 
            id="copyDestStart" 
            value={copyDestStart} 
            onChange={(e) => setCopyDestStart(e.target.value)} 
            className="input-style-sm w-full"
          />
        </div>
        <button 
          onClick={handleCopyMealPlan} 
          className="btn-secondary btn-sm w-full"
        >
          Copy Plan
        </button>
        {copyStatus && (
          <p className={`text-sm ${copyStatus.startsWith('Error:') ? 'text-error' : 'text-success'}`}>
            {copyStatus}
          </p>
        )}
      </div>
    </div>
  </div>
);

const MealPlannerPage = () => {
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isControlsOpen, setIsControlsOpen] = useState(false); // State for collapsible section
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlotInfo, setSelectedSlotInfo] = useState(null);
  const [userRecipes, setUserRecipes] = useState([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('Breakfast');
  const [modalPlannedServings, setModalPlannedServings] = useState(1);

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [mealPlanEntryToDelete, setMealPlanEntryToDelete] = useState(null);

  const [shoppingListStartDate, setShoppingListStartDate] = useState(moment().format('YYYY-MM-DD'));
  const [shoppingListEndDate, setShoppingListEndDate] = useState(moment().add(6, 'days').format('YYYY-MM-DD'));

  // States for copy meal plan feature
  const [copySourceStart, setCopySourceStart] = useState(moment().format('YYYY-MM-DD'));
  const [copySourceEnd, setCopySourceEnd] = useState(moment().add(6, 'days').format('YYYY-MM-DD'));
  const [copyDestStart, setCopyDestStart] = useState(moment().add(7, 'days').format('YYYY-MM-DD'));
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
        // Convert YYYY-MM-DD string to local date to avoid timezone issues
        const dateStr = plan.date;
        const [year, month, day] = dateStr.split('-').map(Number);
        const localDate = new Date(year, month - 1, day); // month is 0-indexed
        
        if (!plan.recipe) { // If recipe was deleted and populate returned null
          return {
            id: plan.mealPlanId, // Use mealPlanId
            title: `${plan.mealType}: (Deleted Recipe)`, // Display a placeholder
            start: localDate,
            end: localDate,
            allDay: true,
            // Provide a minimal resource object so event handlers don't break
            resource: { ...plan, recipe: { name: "(Deleted Recipe)", _id: null } }
          };
        }
        // Existing logic for when recipe exists
        return {
          id: plan.mealPlanId, // Use mealPlanId
          title: `${plan.mealType}: ${plan.recipe.name} (${plan.plannedServings} serv.)`,
          start: localDate,
          end: localDate,
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
      // Fetch both user's recipes and public recipes for meal planning
      const [userResponse, publicResponse] = await Promise.all([
        fetch('/api/recipes', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/recipes/public?limit=200') // Get more public recipes for variety
      ]);
      
      if (!userResponse.ok) throw new Error('Failed to fetch user recipes.');
      const userData = await userResponse.json();
      const userRecipes = userData.recipes || [];
      
      let publicRecipes = [];
      if (publicResponse.ok) {
        const publicData = await publicResponse.json();
        publicRecipes = publicData.recipes || [];
      }
      
      // Combine recipes, marking source
      const allRecipes = [
        ...userRecipes.map(recipe => ({ ...recipe, source: 'personal' })),
        ...publicRecipes.map(recipe => ({ ...recipe, source: 'public' }))
      ];
      
      setUserRecipes(allRecipes);
    } catch (err) {
      console.error("Fetch Recipes error:", err);
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
    const selectedRecipe = userRecipes.find(r => r.recipeId === recipeId); // Changed from r._id
    if (selectedRecipe && selectedRecipe.servings) {
      setModalPlannedServings(selectedRecipe.servings);
    } else {
      setModalPlannedServings(1);
    }
  };

  const handleAddMealPlanEntry = async () => {
    if (!selectedSlotInfo || !selectedRecipeId || !selectedMealType || modalPlannedServings < 1) {
      setError('Please select a recipe, meal type, and specify valid servings.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    const token = localStorage.getItem('token');
    // Extract date components directly to avoid timezone conversion issues
    const selectedDate = selectedSlotInfo.date;
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateToSend = `${year}-${month}-${day}`;
    console.log('[MealPlanner DEBUG] Adding entry for date (raw):', selectedSlotInfo.date);
    console.log('[MealPlanner DEBUG] Adding entry for date (YYYY-MM-DD):', dateToSend);

    try {
      const response = await fetch('/api/mealplans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: dateToSend,
          mealType: selectedMealType,
          recipeId: selectedRecipeId,
          plannedServings: modalPlannedServings,
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to add meal plan entry.');
      }
      
      const newMealPlan = await response.json();
      console.log('[MealPlanner DEBUG] Received new meal plan:', newMealPlan);
      
      // Convert the new meal plan to a calendar event and add it immediately
      const dateStr = newMealPlan.date;
      const [year, month, day] = dateStr.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      
      // Safe access to recipe name with fallback
      const recipeName = newMealPlan.recipe?.name || 'Unknown Recipe';
      console.log('[MealPlanner DEBUG] Recipe name:', recipeName);
      
      const newEvent = {
        id: newMealPlan.mealPlanId,
        title: `${newMealPlan.mealType}: ${recipeName} (${newMealPlan.plannedServings} serv.)`,
        start: localDate,
        end: localDate,
        allDay: true,
        resource: newMealPlan,
      };
      
      // Add the new event to the existing events
      setMyEvents(prevEvents => [...prevEvents, newEvent]);
      
      setShowAddModal(false);
      // Meal plan entry added silently
    } catch (err) {
      console.error("Add Meal Plan Entry error:", err);
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const confirmDeleteMealPlanEntry = useCallback(async () => {
    if (!mealPlanEntryToDelete || !mealPlanEntryToDelete.id) {
      console.error('[MealPlanner DEBUG] Delete aborted: mealPlanEntryToDelete or its ID is null/undefined.', mealPlanEntryToDelete);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) { setError('Authentication required.'); navigate('/login'); return; }

    console.log('[MealPlanner DEBUG] Attempting to delete meal plan entry with ID:', mealPlanEntryToDelete.id);

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
      // Meal plan entry removed silently
    } catch (err) {
      console.error("Delete Meal Plan Entry error:", err.message);
      setError(err.message);
      setTimeout(() => setError(''), 3000);
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
        // No action for events without ID
      }
    },
    []
  );

  const handleGenerateShoppingListFromPlan = () => {
    if (!shoppingListStartDate || !shoppingListEndDate) {
      setError('Please select a valid start and end date for the shopping list.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (moment(shoppingListEndDate).isBefore(moment(shoppingListStartDate))) {
      setError('End date cannot be before start date.');
      setTimeout(() => setError(''), 3000);
      return;
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

  if (loading) return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="text-center">
        <div className="loading-pulse w-12 h-12 rounded-full mx-auto mb-4"></div>
        <p className="body-base">Loading your meal planner...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="body-base text-error">Error: {error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white shadow-soft border-b border-neutral-200">
        <div className="container-app py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="heading-lg text-neutral-900">Meal Planner</h1>
              <p className="body-base text-neutral-600 mt-1">Plan your meals and generate shopping lists</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="btn-outline btn-sm xl:hidden flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Tools
              </button>
              <button
                onClick={() => navigate('/shopping-list')}
                className="btn-outline btn-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Shopping Lists
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-app py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Mobile Sidebar Overlay */}
          {isSidebarOpen && (
            <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-40 xl:hidden" onClick={() => setIsSidebarOpen(false)}>
              <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-xl z-50 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="heading-sm text-neutral-900">Planner Tools</h2>
                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      className="text-neutral-400 hover:text-neutral-600 p-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <SidebarContent 
                    showAddModal={showAddModal}
                    setShowAddModal={setShowAddModal}
                    setSelectedSlotInfo={setSelectedSlotInfo}
                    setSelectedRecipeId={setSelectedRecipeId}
                    setSelectedMealType={setSelectedMealType}
                    setModalPlannedServings={setModalPlannedServings}
                    navigate={navigate}
                    shoppingListStartDate={shoppingListStartDate}
                    setShoppingListStartDate={setShoppingListStartDate}
                    shoppingListEndDate={shoppingListEndDate}
                    setShoppingListEndDate={setShoppingListEndDate}
                    handleGenerateShoppingListFromPlan={handleGenerateShoppingListFromPlan}
                    copySourceStart={copySourceStart}
                    setCopySourceStart={setCopySourceStart}
                    copySourceEnd={copySourceEnd}
                    setCopySourceEnd={setCopySourceEnd}
                    copyDestStart={copyDestStart}
                    setCopyDestStart={setCopyDestStart}
                    handleCopyMealPlan={handleCopyMealPlan}
                    copyStatus={copyStatus}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Desktop Sidebar with Tools */}
          <div className="xl:col-span-1 hidden xl:block">
            <SidebarContent 
              showAddModal={showAddModal}
              setShowAddModal={setShowAddModal}
              setSelectedSlotInfo={setSelectedSlotInfo}
              setSelectedRecipeId={setSelectedRecipeId}
              setSelectedMealType={setSelectedMealType}
              setModalPlannedServings={setModalPlannedServings}
              navigate={navigate}
              shoppingListStartDate={shoppingListStartDate}
              setShoppingListStartDate={setShoppingListStartDate}
              shoppingListEndDate={shoppingListEndDate}
              setShoppingListEndDate={setShoppingListEndDate}
              handleGenerateShoppingListFromPlan={handleGenerateShoppingListFromPlan}
              copySourceStart={copySourceStart}
              setCopySourceStart={setCopySourceStart}
              copySourceEnd={copySourceEnd}
              setCopySourceEnd={setCopySourceEnd}
              copyDestStart={copyDestStart}
              setCopyDestStart={setCopyDestStart}
              handleCopyMealPlan={handleCopyMealPlan}
              copyStatus={copyStatus}
            />
          </div>

          {/* Main Calendar */}
          <div className="xl:col-span-3">
            <div className="card p-6" style={{ height: '75vh' }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h2 className="heading-sm text-neutral-900">
                    {moment(currentDate).format('MMMM YYYY')}
                  </h2>
                  <p className="body-sm text-neutral-500 mt-1">Click a date to add meals, click meals to remove them</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentDate(moment(currentDate).subtract(1, 'month').toDate())}
                    className="btn-ghost btn-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="btn-ghost btn-sm"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setCurrentDate(moment(currentDate).add(1, 'month').toDate())}
                    className="btn-ghost btn-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Meal Type Legend */}
              <div className="flex flex-wrap gap-3 mb-4 p-3 bg-neutral-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-primary-100 border border-primary-500"></div>
                  <span className="text-xs text-neutral-600">🌅 Breakfast</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-secondary-100 border border-secondary-500"></div>
                  <span className="text-xs text-neutral-600">🍽️ Lunch</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-500"></div>
                  <span className="text-xs text-neutral-600">🌙 Dinner</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-purple-100 border border-purple-500"></div>
                  <span className="text-xs text-neutral-600">🍿 Snack</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-500"></div>
                  <span className="text-xs text-neutral-600">☕ Tea</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-red-100 border border-red-500"></div>
                  <span className="text-xs text-neutral-600">🧁 Dessert</span>
                </div>
              </div>
              <div style={{ height: 'calc(100% - 140px)' }}>
                <Calendar
                  localizer={localizer} 
                  events={myEvents} 
                  startAccessor="start" 
                  endAccessor="end"
                  style={{ height: '100%' }} 
                  selectable 
                  onSelectSlot={handleSelectSlot} 
                  onSelectEvent={handleSelectEvent}
                  date={currentDate} 
                  view="month" 
                  onNavigate={(date) => setCurrentDate(date)}
                  views={['month']}
                  eventPropGetter={(event) => ({
                    style: {
                      backgroundColor: event.resource?.mealType === 'Breakfast' ? '#fef7ed' : 
                                      event.resource?.mealType === 'Lunch' ? '#f0fdf4' :
                                      event.resource?.mealType === 'Dinner' ? '#eff6ff' :
                                      event.resource?.mealType === 'Snack' ? '#fdf4ff' :
                                      event.resource?.mealType === 'Tea Time' ? '#fffbeb' :
                                      event.resource?.mealType === 'Dessert' ? '#fef2f2' : '#f9fafb',
                      border: `1px solid ${event.resource?.mealType === 'Breakfast' ? '#ed7514' : 
                                          event.resource?.mealType === 'Lunch' ? '#22c55e' :
                                          event.resource?.mealType === 'Dinner' ? '#3b82f6' :
                                          event.resource?.mealType === 'Snack' ? '#a855f7' :
                                          event.resource?.mealType === 'Tea Time' ? '#f59e0b' :
                                          event.resource?.mealType === 'Dessert' ? '#ef4444' : '#6b7280'}`,
                      color: event.resource?.mealType === 'Breakfast' ? '#b8420b' : 
                             event.resource?.mealType === 'Lunch' ? '#15803d' :
                             event.resource?.mealType === 'Dinner' ? '#1e40af' :
                             event.resource?.mealType === 'Snack' ? '#7c2d12' :
                             event.resource?.mealType === 'Tea Time' ? '#92400e' :
                             event.resource?.mealType === 'Dessert' ? '#b91c1c' : '#374151',
                      borderRadius: '6px',
                      fontSize: '12px',
                      padding: '2px 6px'
                    }
                  })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Meal to Plan">
        <div className="space-y-6">
          <div>
            <label htmlFor="mealDate" className="block text-sm font-medium text-neutral-700 mb-2">Date</label>
            <input 
              type="text" 
              id="mealDate" 
              readOnly 
              value={selectedSlotInfo ? moment(selectedSlotInfo.date).format('dddd, MMMM Do, YYYY') : ''} 
              className="input-style w-full bg-neutral-50 text-neutral-600"
            />
          </div>
          
          <div>
            <label htmlFor="mealTypeSelect" className="block text-sm font-medium text-neutral-700 mb-2">Meal Type</label>
            <select 
              id="mealTypeSelect" 
              value={selectedMealType} 
              onChange={(e) => setSelectedMealType(e.target.value)} 
              className="select-style w-full"
            >
              <option value="Breakfast">🌅 Breakfast</option>
              <option value="Lunch">🍽️ Lunch</option>
              <option value="Dinner">🌙 Dinner</option>
              <option value="Snack">🍿 Snack</option>
              <option value="Tea Time">☕ Tea Time</option>
              <option value="Dessert">🧁 Dessert</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="recipeSelect" className="block text-sm font-medium text-neutral-700 mb-2">Recipe</label>
            <select 
              id="recipeSelect" 
              value={selectedRecipeId} 
              onChange={(e) => handleRecipeSelectionChange(e.target.value)} 
              className="select-style w-full"
            >
              <option value="">-- Select a Recipe --</option>
              {userRecipes.filter(recipe => recipe.source === 'personal').length > 0 && (
                <optgroup label="📝 My Recipes">
                  {userRecipes
                    .filter(recipe => recipe.source === 'personal')
                    .map(recipe => (
                      <option key={recipe.recipeId} value={recipe.recipeId}>
                        {recipe.name} (Serves {recipe.servings || 'N/A'})
                      </option>
                    ))
                  }
                </optgroup>
              )}
              {userRecipes.filter(recipe => recipe.source === 'public').length > 0 && (
                <optgroup label="🌍 Public Recipes">
                  {userRecipes
                    .filter(recipe => recipe.source === 'public')
                    .map(recipe => (
                      <option key={recipe.recipeId} value={recipe.recipeId}>
                        {recipe.name} (Serves {recipe.servings || 'N/A'}) {recipe.category ? `- ${recipe.category}` : ''}
                      </option>
                    ))
                  }
                </optgroup>
              )}
            </select>
          </div>
          
          <div>
            <label htmlFor="plannedServings" className="block text-sm font-medium text-neutral-700 mb-2">Servings for this meal</label>
            <input 
              type="number" 
              id="plannedServings" 
              name="plannedServings" 
              value={modalPlannedServings} 
              onChange={(e) => setModalPlannedServings(parseInt(e.target.value, 10) || 1)} 
              min="1" 
              required 
              className="input-style w-full"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
            <button 
              type="button" 
              onClick={() => setShowAddModal(false)} 
              className="btn-ghost"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleAddMealPlanEntry} 
              className="btn-primary"
              disabled={!selectedRecipeId}
            >
              Add to Plan
            </button>
          </div>
        </div>
      </Modal>
      {mealPlanEntryToDelete && (
        <Modal isOpen={showDeleteConfirmModal} onClose={() => { setShowDeleteConfirmModal(false); setMealPlanEntryToDelete(null); }} title="Remove Meal">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-error/5 rounded-xl border border-error/20">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-error">Are you sure?</h4>
                <p className="text-sm text-neutral-600 mt-1">
                  This will remove "{mealPlanEntryToDelete.title}" from your meal plan. This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => { setShowDeleteConfirmModal(false); setMealPlanEntryToDelete(null); }} 
                className="btn-ghost"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={confirmDeleteMealPlanEntry} 
                className="bg-error hover:bg-error/90 text-white font-medium py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error"
              >
                Remove Meal
              </button>
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
