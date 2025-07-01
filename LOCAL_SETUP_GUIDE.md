# 🏠 Local Setup Guide for Indian Recipes Import

## Prerequisites Check

Before running the import, verify these steps on your **local machine** where Docker is running:

### 1. ✅ DynamoDB Local is Running
```bash
# Check if DynamoDB container is running
docker ps | grep dynamodb

# If not running, start it:
docker compose up -d dynamodb-local

# Test accessibility:
curl http://localhost:8000
# Should return: {"__type":"com.amazon.coral.validate#ValidationException","message":"Unexpected operation."}
```

### 2. ✅ Environment Variables are Set
Check your `server/.env` file contains:
```env
DYNAMODB_ENDPOINT_OVERRIDE=http://localhost:8000
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
AWS_REGION=us-east-1
RECIPES_TABLE_NAME=recipe-app-all-resources
```

### 3. ✅ Tables are Initialized
```bash
cd server
node config/init-dynamodb.js
```

## Import Methods

### Method 1: Automated Script (Recommended)
```bash
# From project root
./import-recipes.sh
```

### Method 2: Simple Node Script
```bash
# From project root
node import-recipes-simple.js
```

### Method 3: Direct Import
```bash
cd server
node scripts/import-indian-recipes.js
```

## Verification Steps

After successful import:

### 1. Check Database
```bash
cd server
node -e "
const { getAllPublicRecipes } = require('./models/Recipe');
getAllPublicRecipes(100).then(recipes => {
  const indianRecipes = recipes.filter(r => r.category?.includes('Indian'));
  console.log(\`Found \${indianRecipes.length} Indian recipes\`);
  indianRecipes.forEach(r => console.log(\`- \${r.name}\`));
});
"
```

### 2. Test Web Application
1. Start the application:
   ```bash
   # Terminal 1: Start server
   cd server && npm start
   
   # Terminal 2: Start client
   cd client && npm start
   ```

2. Open http://localhost:3000
3. Go to "Discover" page - you should see Indian recipes
4. Go to "Meal Planner" page
5. Click on a date to add a meal
6. In the recipe dropdown, you should see "🌍 Public Recipes" section with Indian dishes

## Expected Results

After successful import, you should see:

**South Indian Recipes:**
- Classic Masala Dosa
- Idli Sambar
- Medu Vada
- Coconut Rice (Thengai Sadam)
- Chettinad Chicken Curry
- Biryani Hyderabadi

**North Indian Recipes:**
- Butter Chicken (Murgh Makhani)
- Dal Makhani
- Chole Bhature
- Aloo Gobi
- Paneer Butter Masala
- Rajma Chawal
- Tandoori Chicken
- Poha (Flattened Rice)

**Beverages:**
- Masala Chai

## Troubleshooting

### Error: ECONNREFUSED on port 8000
- **Solution**: DynamoDB Local is not running or not accessible
- **Fix**: `docker compose up -d dynamodb-local`

### Error: ResourceNotFoundException
- **Solution**: Tables are not initialized
- **Fix**: `cd server && node config/init-dynamodb.js`

### Error: ENOTFOUND dynamodb.localhost.amazonaws.com
- **Solution**: Environment variables not loaded correctly
- **Fix**: Check `.env` file exists in `server/` directory

### Import shows 0 successful recipes
- **Solution**: Recipe creation is failing
- **Fix**: Check that tables exist and have correct permissions

## Alternative: Manual Import via UI

If automated import fails, you can manually add recipes:

1. Start the application
2. Register/Login to the app
3. Go to "Create Recipe" page
4. Copy recipe data from `server/data/indian-recipes.json`
5. Fill out the form for each recipe
6. Make sure to check "Make this recipe public"

## Next Steps

After successful import:
1. Test the meal planner with Indian recipes
2. Create meal plans using the new recipes
3. Generate shopping lists from Indian meal plans
4. Share your favorite Indian recipe collections

🎉 Enjoy planning meals with authentic Indian cuisine!