# 🇮🇳 Manual Import Guide for Indian Recipes

## Step-by-Step Instructions

### Step 1: Start DynamoDB Local

Choose one of these options:

**Option A: Using Docker Compose (Recommended)**
```bash
docker compose up -d dynamodb-local
```

**Option B: Using Docker directly**
```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

**Option C: If you have DynamoDB Local JAR file**
```bash
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -port 8000
```

### Step 2: Verify DynamoDB Local is Running

Test the connection:
```bash
curl http://localhost:8000
```

You should see a response like: `{"__type":"com.amazon.coral.validate#ValidationException","message":"Unexpected operation."}`

### Step 3: Initialize Tables

```bash
cd server
node config/init-dynamodb.js
```

### Step 4: Check Environment Variables

Make sure your `server/.env` file contains:
```
DYNAMODB_ENDPOINT_OVERRIDE=http://localhost:8000
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
AWS_REGION=us-east-1
RECIPES_TABLE_NAME=recipe-app-all-resources
```

### Step 5: Install Dependencies

```bash
cd server
npm install
```

### Step 6: Run the Import Script

**Option A: Automated script**
```bash
# From project root
./import-recipes.sh
```

**Option B: Simple Node.js script**
```bash
# From project root
node import-recipes-simple.js
```

**Option C: Direct script execution**
```bash
cd server
node scripts/import-indian-recipes.js
```

## Troubleshooting

### Error: ENOTFOUND dynamodb.localhost.amazonaws.com
- **Cause**: Environment variables not loaded correctly
- **Solution**: Check that `.env` file exists in `server/` directory and contains correct values

### Error: Connection refused on port 8000
- **Cause**: DynamoDB Local is not running
- **Solution**: Start DynamoDB Local using one of the methods in Step 1

### Error: ResourceNotFoundException
- **Cause**: Tables not initialized
- **Solution**: Run the table initialization script: `node config/init-dynamodb.js`

### Error: Cannot find module
- **Cause**: Dependencies not installed
- **Solution**: Run `npm install` in the server directory

## Manual Recipe Creation (Last Resort)

If all automated methods fail, you can manually create recipes through the UI:

1. Start your application: `cd client && npm start`
2. Go to `http://localhost:3000`
3. Login/Register
4. Go to "Create Recipe" page
5. Copy recipe data from `server/data/indian-recipes.json`
6. Paste into the form and submit

## Verification

After successful import:
1. Go to `http://localhost:3000/discover`
2. You should see Indian recipes in the public recipes section
3. Go to `http://localhost:3000/meal-planner`
4. Click on a date to add a meal
5. The recipe dropdown should include Indian recipes under "🌍 Public Recipes"

## Need Help?

If you're still having issues:
1. Check the console output for specific error messages
2. Verify all prerequisites are met
3. Try the manual recipe creation method as a fallback