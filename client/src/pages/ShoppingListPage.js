import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ShoppingListPage = () => {
  const [shoppingList, setShoppingList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchShoppingList = async () => {
      const params = new URLSearchParams(location.search);
      const startDate = params.get('startDate');
      const endDate = params.get('endDate');
      
      if (!startDate || !endDate) {
        setError('Date range not provided for the shopping list.');
        setLoading(false);
        // Optionally redirect back or show a message to select recipes
        navigate('/meal-planner'); // Redirect to meal planner if no date range
        return;
      }

      // const recipeIds = recipeIdsParam.split(','); // No longer using recipeIds directly from query
      const token = localStorage.getItem('token');

      if (!token) {
        setError('You must be logged in to generate a shopping list.');
        setLoading(false);
        navigate('/login');
        return;
      }

      try {
        const response = await fetch('/api/shopping-list/generate', {
          method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ startDate, endDate }), // Send date range
      });

      if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Failed to generate shopping list');
        }
        const data = await response.json();
        setShoppingList(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchShoppingList();
  }, [location.search, navigate]);

  // Simple client-side checked items state
  const [checkedItems, setCheckedItems] = useState(new Set());
  const handleCheckItem = (category, itemName, itemUnit) => {
    const key = `${category}-${itemName}-${itemUnit}`;
    setCheckedItems(prev => {
      const newChecked = new Set(prev);
      if (newChecked.has(key)) {
        newChecked.delete(key);
      } else {
        newChecked.add(key);
      }
      return newChecked;
    });
  };


  if (loading) return <div className="text-center p-4">Generating your shopping list...</div>;
  if (error) return <div className="text-center p-4 text-red-500">Error: {error}</div>;
  if (!shoppingList || Object.keys(shoppingList).length === 0) return <div className="text-center p-4">Your shopping list is empty or no recipes were processed.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-8">Your Shopping List</h1>
      {Object.entries(shoppingList).map(([category, items]) => (
        <div key={category} className="mb-6 bg-white shadow-md rounded-lg p-4">
          <h2 className="text-2xl font-semibold mb-3 text-indigo-700 border-b pb-2">{category} ({items.length})</h2>
          <ul className="list-none space-y-2">
            {items.map((item, index) => {
              const itemKey = `${category}-${item.name}-${item.unit}`;
              const isChecked = checkedItems.has(itemKey);
              return (
                <li key={index} className={`flex items-center p-2 rounded transition-colors ${isChecked ? 'bg-green-100 line-through text-gray-500' : 'hover:bg-gray-50'}`}>
                  <input 
                    type="checkbox"
                    id={itemKey}
                    checked={isChecked}
                    onChange={() => handleCheckItem(category, item.name, item.unit)}
                    className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mr-3"
                  />
                  <label htmlFor={itemKey} className="cursor-pointer flex-grow">
                    <span className="font-medium">{item.name}</span> 
                    {item.quantity || item.unit ? ` - ${item.quantity || ''} ${item.unit || ''}`.trim() : ''}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
       <div className="mt-6 text-sm text-gray-600">
        <p><strong>Note:</strong> Quantities for ingredients with the same name but different units are listed separately. Manual unit conversion may be needed.</p>
      </div>
    </div>
  );
};

export default ShoppingListPage;
