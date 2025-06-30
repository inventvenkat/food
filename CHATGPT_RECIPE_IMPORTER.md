# 🤖 ChatGPT Recipe Importer

Automatically import recipes from text files using ChatGPT to structure the data and your recipe API to create them.

## 🚀 Quick Start

### 1. Set up OpenAI API Key
```bash
export OPENAI_API_KEY="your-openai-api-key-here"
```

### 2. Create Recipe Files
Put your recipe files in a directory. Supported formats:
- `.txt` - Plain text recipes
- `.md` - Markdown formatted recipes  
- `.recipe` - Custom recipe files

### 3. Run the Importer
```bash
cd server
node scripts/chatgpt-recipe-importer.js /path/to/your/recipe/directory
```

## 📝 Example Usage

### Test with Sample Recipes
```bash
# Use the provided sample recipes
cd server
export OPENAI_API_KEY="sk-your-key-here"
node scripts/chatgpt-recipe-importer.js ../sample-recipes
```

### Import Your Own Recipes
```bash
# Create your recipe directory
mkdir my-recipes

# Add your recipe files (see format below)
# Then import them
node scripts/chatgpt-recipe-importer.js ./my-recipes
```

## 📋 Recipe File Format

Your recipe files can be in plain text format. The script uses ChatGPT to parse any reasonable recipe format. Here's an example:

```text
Spaghetti Carbonara

A classic Italian pasta dish with eggs, cheese, and pancetta.

Ingredients:
- 400g spaghetti
- 200g pancetta, diced
- 4 large eggs
- 100g Parmesan cheese, grated
- Black pepper
- Salt

Instructions:
1. Cook spaghetti according to package directions
2. Fry pancetta until crispy
3. Beat eggs with cheese
4. Combine hot pasta with pancetta
5. Add egg mixture and toss quickly
6. Season with pepper and serve

Serves 4, takes about 20 minutes
```

## ⚙️ Configuration

### Environment Variables
```bash
# Required
OPENAI_API_KEY=your-openai-api-key

# Optional (defaults shown)
RECIPE_API_URL=http://localhost:3002/api/recipes
LOGIN_API_URL=http://localhost:3002/api/auth/login
```

### API Settings
The script will automatically:
1. Create/login as user "recipe-importer"
2. Use your local recipe API to create recipes
3. Mark all recipes as public by default

## 🎯 Features

- **Smart Parsing**: ChatGPT understands various recipe formats
- **Automatic Structuring**: Extracts ingredients, instructions, timing, etc.
- **Category Detection**: Automatically categorizes recipes (Italian, Indian, etc.)
- **Tag Generation**: Adds relevant tags (vegetarian, spicy, quick, etc.)
- **API Integration**: Creates recipes directly in your app
- **Error Handling**: Continues processing even if some recipes fail
- **Progress Tracking**: Shows detailed import statistics

## 📊 Expected Output

```
🚀 ChatGPT Recipe Importer Starting...
=====================================
🔐 Authenticating...
✅ Authenticated with recipe API
📁 Found 3 recipe files in ../sample-recipes
📚 Processing recipes...
📝 Processing: masala-dosa.txt
   🤖 Parsing with ChatGPT...
   📡 Creating via API...
   ✅ Success: Classic Masala Dosa (ID: recipe-123)
📝 Processing: butter-chicken.txt
   🤖 Parsing with ChatGPT...
   📡 Creating via API...
   ✅ Success: Butter Chicken (ID: recipe-124)

📊 Import Results:
==================
📁 Total files processed: 3
✅ Successfully imported: 3
❌ Failed: 0

🎉 Import completed successfully!
🌐 Check your app:
   - Discover page: http://localhost:3003/discover
   - Meal planner: http://localhost:3003/meal-planner
```

## 🛠️ Troubleshooting

### "OpenAI API key not configured"
Set your OpenAI API key:
```bash
export OPENAI_API_KEY="sk-your-actual-key-here"
```

### "Authentication failed"
Make sure your recipe API server is running:
```bash
cd server && npm start
```

### "No recipe files found"
Ensure your files have supported extensions:
- Rename files to `.txt`, `.md`, or `.recipe`
- Check the directory path is correct

### ChatGPT parsing fails
- Ensure recipe files have clear ingredient and instruction sections
- Try simplifying very complex or unusual recipe formats
- Check OpenAI API quota/billing

## 💡 Tips

1. **Better Results**: Write recipes with clear sections (Ingredients, Instructions)
2. **Cost Efficiency**: Each recipe costs ~$0.01-0.05 in OpenAI credits
3. **Batch Processing**: Process multiple recipes at once for efficiency
4. **Review Results**: Check created recipes in your app and edit if needed

## 🔧 Advanced Usage

### Custom API Endpoints
```bash
export RECIPE_API_URL="http://your-server:3000/api/recipes"
export LOGIN_API_URL="http://your-server:3000/api/auth/login"
```

### Different OpenAI Models
Edit the script to use `gpt-4` for better parsing (higher cost):
```javascript
model: 'gpt-4' // Instead of 'gpt-3.5-turbo'
```

Happy cooking! 🍳✨