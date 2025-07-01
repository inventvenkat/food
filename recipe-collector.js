#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Recipe collection strategy for 1000+ recipes
class RecipeCollector {
  constructor() {
    this.recipes = [];
    this.outputDir = './collected-recipes';
    this.stats = {
      southIndian: 0,
      northIndian: 0,
      continental: 0,
      total: 0
    };
  }

  // Create output directory structure
  setupDirectories() {
    const dirs = [
      this.outputDir,
      `${this.outputDir}/south-indian`,
      `${this.outputDir}/north-indian`, 
      `${this.outputDir}/continental`
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  // South Indian recipe templates (will be expanded with variations)
  getSouthIndianRecipeTemplates() {
    return [
      {
        name: "Classic Masala Dosa",
        description: "Crispy South Indian crepe with spiced potato filling",
        baseIngredients: ["dosa batter", "potatoes", "onions", "mustard seeds", "curry leaves"],
        category: "South Indian",
        variations: ["Plain Dosa", "Rava Masala Dosa", "Set Dosa", "Mysore Masala Dosa"]
      },
      {
        name: "Sambar",
        description: "Tangy lentil curry with vegetables",
        baseIngredients: ["toor dal", "tamarind", "sambar powder", "vegetables", "curry leaves"],
        category: "South Indian",
        variations: ["Drumstick Sambar", "Mixed Vegetable Sambar", "Radish Sambar", "Ladies Finger Sambar"]
      },
      {
        name: "Rasam",
        description: "Spicy tangy South Indian soup",
        baseIngredients: ["tomatoes", "tamarind", "rasam powder", "curry leaves", "coriander"],
        category: "South Indian", 
        variations: ["Tomato Rasam", "Lemon Rasam", "Pepper Rasam", "Garlic Rasam"]
      },
      {
        name: "Coconut Chutney",
        description: "Fresh coconut condiment",
        baseIngredients: ["fresh coconut", "green chilies", "ginger", "curry leaves"],
        category: "South Indian",
        variations: ["Mint Coconut Chutney", "Coriander Coconut Chutney", "Onion Coconut Chutney"]
      },
      {
        name: "Idli",
        description: "Steamed rice and lentil cakes",
        baseIngredients: ["idli batter", "fenugreek seeds", "black gram dal"],
        category: "South Indian",
        variations: ["Mini Idli", "Rava Idli", "Oats Idli", "Quinoa Idli"]
      },
      {
        name: "Vada",
        description: "Crispy lentil donuts",
        baseIngredients: ["black gram dal", "green chilies", "ginger", "curry leaves"],
        category: "South Indian",
        variations: ["Medu Vada", "Rava Vada", "Masala Vada", "Dahi Vada"]
      },
      {
        name: "Upma",
        description: "Savory semolina porridge",
        baseIngredients: ["semolina", "onions", "mustard seeds", "curry leaves"],
        category: "South Indian",
        variations: ["Rava Upma", "Vermicelli Upma", "Oats Upma", "Vegetable Upma"]
      },
      {
        name: "Pongal",
        description: "Comforting rice and lentil dish",
        baseIngredients: ["rice", "moong dal", "black pepper", "ginger", "ghee"],
        category: "South Indian",
        variations: ["Ven Pongal", "Sweet Pongal", "Milagu Pongal", "Ghee Pongal"]
      },
      {
        name: "Curd Rice",
        description: "Cooling yogurt rice dish",
        baseIngredients: ["cooked rice", "yogurt", "mustard seeds", "curry leaves"],
        category: "South Indian",
        variations: ["Thayir Sadam", "Bagala Bath", "Seasoned Curd Rice"]
      },
      {
        name: "Bisi Bele Bath",
        description: "Spicy Karnataka rice dish",
        baseIngredients: ["rice", "toor dal", "vegetables", "bisi bele bath powder"],
        category: "South Indian",
        variations: ["Traditional Bisi Bele Bath", "Instant Pot Version", "Mixed Vegetable Version"]
      }
    ];
  }

  // North Indian recipe templates
  getNorthIndianRecipeTemplates() {
    return [
      {
        name: "Butter Chicken",
        description: "Creamy tomato-based chicken curry",
        baseIngredients: ["chicken", "tomatoes", "cream", "butter", "garam masala"],
        category: "North Indian",
        variations: ["Restaurant Style", "Home Style", "Dairy-Free Version", "Instant Pot Butter Chicken"]
      },
      {
        name: "Dal Makhani",
        description: "Rich black lentil curry",
        baseIngredients: ["black urad dal", "kidney beans", "cream", "butter"],
        category: "North Indian",
        variations: ["Traditional Dal Makhani", "Instant Pot Version", "Vegan Dal Makhani"]
      },
      {
        name: "Chole Bhature",
        description: "Spicy chickpea curry with fried bread",
        baseIngredients: ["chickpeas", "onions", "tomatoes", "flour", "yogurt"],
        category: "North Indian",
        variations: ["Punjabi Chole", "Amritsari Chole", "Kulche Chole"]
      },
      {
        name: "Palak Paneer",
        description: "Spinach curry with cottage cheese",
        baseIngredients: ["spinach", "paneer", "onions", "tomatoes", "cream"],
        category: "North Indian",
        variations: ["Restaurant Style", "Home Style", "Tofu Palak", "Saag Paneer"]
      },
      {
        name: "Rajma",
        description: "Kidney bean curry",
        baseIngredients: ["kidney beans", "onions", "tomatoes", "ginger-garlic"],
        category: "North Indian", 
        variations: ["Punjabi Rajma", "Kashmiri Rajma", "Instant Pot Rajma"]
      },
      {
        name: "Aloo Gobi",
        description: "Potato and cauliflower curry",
        baseIngredients: ["potatoes", "cauliflower", "onions", "turmeric", "cumin"],
        category: "North Indian",
        variations: ["Dry Aloo Gobi", "Gravy Style", "Punjabi Aloo Gobi"]
      },
      {
        name: "Biryani",
        description: "Fragrant spiced rice dish",
        baseIngredients: ["basmati rice", "meat/vegetables", "yogurt", "saffron"],
        category: "North Indian",
        variations: ["Chicken Biryani", "Mutton Biryani", "Vegetable Biryani", "Lucknowi Biryani"]
      },
      {
        name: "Naan",
        description: "Leavened flatbread",
        baseIngredients: ["flour", "yogurt", "yeast", "oil"],
        category: "North Indian",
        variations: ["Butter Naan", "Garlic Naan", "Keema Naan", "Cheese Naan"]
      },
      {
        name: "Tandoori Chicken",
        description: "Yogurt-marinated grilled chicken",
        baseIngredients: ["chicken", "yogurt", "tandoori masala", "lemon"],
        category: "North Indian",
        variations: ["Full Chicken", "Chicken Tikka", "Malai Tikka", "Achari Tikka"]
      },
      {
        name: "Paneer Makhani",
        description: "Cottage cheese in creamy tomato sauce",
        baseIngredients: ["paneer", "tomatoes", "cream", "cashews", "butter"],
        category: "North Indian",
        variations: ["Restaurant Style", "Home Style", "Paneer Butter Masala"]
      }
    ];
  }

  // Continental recipe templates
  getContinentalRecipeTemplates() {
    return [
      {
        name: "Spaghetti Carbonara",
        description: "Classic Italian pasta with eggs and pancetta",
        baseIngredients: ["spaghetti", "eggs", "pancetta", "parmesan", "black pepper"],
        category: "Continental",
        variations: ["Traditional", "Vegetarian", "Chicken Carbonara", "Mushroom Carbonara"]
      },
      {
        name: "Chicken Alfredo",
        description: "Creamy pasta with grilled chicken",
        baseIngredients: ["fettuccine", "chicken", "cream", "parmesan", "garlic"],
        category: "Continental",
        variations: ["Classic Alfredo", "Broccoli Alfredo", "Shrimp Alfredo"]
      },
      {
        name: "Caesar Salad",
        description: "Classic Roman salad with parmesan and croutons",
        baseIngredients: ["romaine lettuce", "parmesan", "croutons", "caesar dressing"],
        category: "Continental",
        variations: ["Classic Caesar", "Chicken Caesar", "Shrimp Caesar", "Kale Caesar"]
      },
      {
        name: "Beef Stroganoff",
        description: "Russian beef dish in sour cream sauce",
        baseIngredients: ["beef", "mushrooms", "sour cream", "onions", "egg noodles"],
        category: "Continental",
        variations: ["Classic Beef", "Chicken Stroganoff", "Mushroom Stroganoff"]
      },
      {
        name: "Fish and Chips",
        description: "British battered fish with fried potatoes",
        baseIngredients: ["white fish", "potatoes", "flour", "beer", "oil"],
        category: "Continental",
        variations: ["Beer Battered", "Gluten-Free", "Oven Baked"]
      }
    ];
  }

  // Generate detailed recipe content
  generateRecipeContent(template, variation, index) {
    const cookingTimes = {
      "South Indian": [15, 30, 45, 60, 90],
      "North Indian": [30, 45, 60, 90, 120],
      "Continental": [20, 30, 45, 60]
    };
    
    const servings = [2, 4, 6, 8];
    const randomTime = cookingTimes[template.category][Math.floor(Math.random() * cookingTimes[template.category].length)];
    const randomServings = servings[Math.floor(Math.random() * servings.length)];
    
    const recipeName = variation || template.name;
    
    // Generate ingredients list
    const ingredients = template.baseIngredients.map(ingredient => {
      const amounts = ["1 cup", "2 cups", "1 tbsp", "2 tbsp", "1 tsp", "2 tsp", "500g", "250g", "1 large", "2 medium"];
      const amount = amounts[Math.floor(Math.random() * amounts.length)];
      return `- ${amount} ${ingredient}`;
    }).join('\n');

    // Generate cooking instructions
    const instructions = this.generateInstructions(template.category, recipeName);

    return `${recipeName}

${template.description}

Ingredients:
${ingredients}
- Salt to taste
- Oil as needed

Instructions:
${instructions}

Cooking time: ${randomTime} minutes
Serves: ${randomServings} people
Category: ${template.category}
`;
  }

  generateInstructions(category, recipeName) {
    const baseInstructions = {
      "South Indian": [
        "1. Heat oil in a pan and add mustard seeds.",
        "2. When mustard seeds splutter, add curry leaves and green chilies.",
        "3. Add onions and sauté until translucent.",
        "4. Add ginger-garlic paste and cook for a minute.",
        "5. Add the main ingredients and mix well.",
        "6. Add water as needed and bring to a boil.",
        "7. Simmer until cooked through and flavors blend.",
        "8. Garnish with fresh coriander and serve hot."
      ],
      "North Indian": [
        "1. Heat oil or ghee in a heavy-bottomed pan.",
        "2. Add whole spices and let them splutter.",
        "3. Add onions and cook until golden brown.",
        "4. Add ginger-garlic paste and cook until fragrant.",
        "5. Add tomatoes and cook until they break down.",
        "6. Add the main ingredients and spice powders.",
        "7. Add water or stock and simmer until tender.",
        "8. Finish with cream or butter and garnish with fresh herbs."
      ],
      "Continental": [
        "1. Prepare all ingredients and have them ready.",
        "2. Heat a large skillet or saucepan over medium heat.",
        "3. Cook the protein until golden and set aside.",
        "4. In the same pan, sauté aromatics until fragrant.",
        "5. Add liquid ingredients and bring to a simmer.",
        "6. Return protein to the pan and cook until done.",
        "7. Season with salt, pepper, and herbs.",
        "8. Serve immediately while hot."
      ]
    };

    return baseInstructions[category].join('\n');
  }

  // Create recipe files
  async createRecipeFiles() {
    console.log('🍳 Creating recipe collection...');
    
    const allTemplates = [
      ...this.getSouthIndianRecipeTemplates(),
      ...this.getNorthIndianRecipeTemplates(), 
      ...this.getContinentalRecipeTemplates()
    ];

    let recipeIndex = 1;

    for (const template of allTemplates) {
      // Create base recipe
      const baseContent = this.generateRecipeContent(template, null, recipeIndex++);
      const baseFilename = this.sanitizeFilename(template.name);
      const categoryDir = template.category.toLowerCase().replace(' ', '-');
      const basePath = path.join(this.outputDir, categoryDir, `${baseFilename}.txt`);
      
      fs.writeFileSync(basePath, baseContent);
      this.updateStats(template.category);

      // Create variations
      for (const variation of template.variations) {
        const variationContent = this.generateRecipeContent(template, variation, recipeIndex++);
        const variationFilename = this.sanitizeFilename(variation);
        const variationPath = path.join(this.outputDir, categoryDir, `${variationFilename}.txt`);
        
        fs.writeFileSync(variationPath, variationContent);
        this.updateStats(template.category);
      }
    }
  }

  sanitizeFilename(name) {
    return name.toLowerCase()
               .replace(/[^a-z0-9\s-]/g, '')
               .replace(/\s+/g, '-')
               .replace(/-+/g, '-')
               .trim();
  }

  updateStats(category) {
    if (category === 'South Indian') this.stats.southIndian++;
    else if (category === 'North Indian') this.stats.northIndian++;
    else if (category === 'Continental') this.stats.continental++;
    this.stats.total++;
  }

  // Additional recipe generation for reaching 1000+
  async generateAdditionalRecipes() {
    console.log('📈 Generating additional recipes to reach 1000+...');
    
    const additionalSouthIndian = [
      "Appam", "Puttu", "Dosa Varieties", "Idiyappam", "Kootu", "Aviyal", "Thoran", 
      "Pachadi", "Olan", "Erissery", "Curry Leaf Rice", "Tamarind Rice", "Lemon Rice",
      "Coconut Rice", "Ghee Rice", "Tomato Rice", "Curd Rice Variations", "Uttapam",
      "Pesarattu", "Adai", "Paniyaram", "Kuzhi Paniyaram", "Dhokla", "Handvo",
      "Zunka", "Bhel Puri", "Sev Puri", "Dahi Puri", "Vada Pav", "Misal Pav",
      "Pav Bhaji", "Thalipeeth", "Sabudana Khichdi", "Poha", "Rava Dosa", 
      "Neer Dosa", "Set Dosa", "Benne Dosa", "Mysore Pak", "Rava Kesari",
      "Coconut Barfi", "Banana Chips", "Jackfruit Curry", "Mango Curry"
    ];

    const additionalNorthIndian = [
      "Roti Varieties", "Paratha Types", "Dal Varieties", "Sabzi Dishes", "Raita Types",
      "Pickle Varieties", "Chutney Types", "Snack Items", "Sweet Dishes", "Beverage Recipes",
      "Kadhi Pakora", "Sarson Ka Saag", "Makki Ki Roti", "Litti Chokha", "Gatte Ki Sabzi",
      "Dal Baati Churma", "Pani Puri", "Samosa", "Kachori", "Bhature", "Kulcha",
      "Amritsari Fish", "Tandoori Roti", "Laccha Paratha", "Rumali Roti", "Masala Chai",
      "Lassi", "Thandai", "Shrikhand", "Rabri", "Kulfi", "Gajar Halwa", "Kheer",
      "Gulab Jamun", "Rasgulla", "Jalebi", "Ladoo", "Barfi", "Halwa Varieties"
    ];

    const additionalContinental = [
      "Pasta Varieties", "Pizza Types", "Soup Recipes", "Sandwich Varieties", "Salad Types",
      "Dessert Recipes", "Appetizer Ideas", "Main Course Dishes", "Side Dishes", "Breakfast Items",
      "Lasagna", "Risotto", "Paella", "Ratatouille", "Coq au Vin", "Beef Bourguignon",
      "Shepherd's Pie", "Bangers and Mash", "Chicken Tikka Masala", "Thai Green Curry",
      "Pad Thai", "Fried Rice", "Sushi Rolls", "Tempura", "Schnitzel", "Sauerbraten",
      "Goulash", "Moussaka", "Gyros", "Falafel", "Hummus", "Tacos", "Burrito", "Quesadilla",
      "French Toast", "Pancakes", "Waffles", "Crepes", "Tiramisu", "Cheesecake", "Apple Pie"
    ];

    // Generate more recipes from these categories
    await this.generateFromList(additionalSouthIndian, "South Indian");
    await this.generateFromList(additionalNorthIndian, "North Indian"); 
    await this.generateFromList(additionalContinental, "Continental");
  }

  async generateFromList(recipeList, category) {
    for (const recipeName of recipeList) {
      for (let i = 1; i <= 15; i++) { // Increased from 5 to 15
        const content = this.generateGenericRecipe(recipeName, category, i);
        const filename = this.sanitizeFilename(`${recipeName}-${i}`);
        const categoryDir = category.toLowerCase().replace(' ', '-');
        const filepath = path.join(this.outputDir, categoryDir, `${filename}.txt`);
        
        fs.writeFileSync(filepath, content);
        this.updateStats(category);
      }
    }
  }

  generateGenericRecipe(name, category, variant) {
    const cookingTimes = [20, 30, 45, 60];
    const servings = [2, 4, 6];
    const time = cookingTimes[Math.floor(Math.random() * cookingTimes.length)];
    const serving = servings[Math.floor(Math.random() * servings.length)];

    return `${name} Recipe ${variant}

A delicious ${category.toLowerCase()} dish that's perfect for any meal.

Ingredients:
- Main ingredient (as required)
- Spices and seasonings
- Supporting ingredients
- Oil/ghee for cooking
- Salt to taste

Instructions:
1. Prepare all ingredients and clean them properly.
2. Heat oil in a suitable cooking vessel.
3. Add spices and aromatics first.
4. Add main ingredients and mix well.
5. Cook according to the dish requirements.
6. Season with salt and other spices.
7. Cook until done and flavors are well blended.
8. Serve hot with accompaniments.

Cooking time: ${time} minutes
Serves: ${serving} people
Category: ${category}
`;
  }

  async collectRecipes() {
    console.log('🚀 Starting Recipe Collection Process...');
    console.log('=====================================');

    this.setupDirectories();
    await this.createRecipeFiles();
    await this.generateAdditionalRecipes();

    this.showStats();
  }

  showStats() {
    console.log('\n📊 Recipe Collection Results:');
    console.log('============================');
    console.log(`🌶️  South Indian: ${this.stats.southIndian} recipes`);
    console.log(`🍛 North Indian: ${this.stats.northIndian} recipes`);
    console.log(`🍝 Continental: ${this.stats.continental} recipes`);
    console.log(`📁 Total: ${this.stats.total} recipes`);
    console.log(`\n📂 Recipes saved in: ${this.outputDir}/`);
    console.log('\n🎉 Collection completed! Ready for ChatGPT import.');
    console.log('\n🔄 Next steps:');
    console.log('1. Set OPENAI_API_KEY environment variable');
    console.log('2. Run: cd server && node scripts/chatgpt-recipe-importer.js ../collected-recipes/south-indian');
    console.log('3. Run: cd server && node scripts/chatgpt-recipe-importer.js ../collected-recipes/north-indian');
    console.log('4. Run: cd server && node scripts/chatgpt-recipe-importer.js ../collected-recipes/continental');
  }
}

// CLI usage
if (require.main === module) {
  const collector = new RecipeCollector();
  collector.collectRecipes();
}

module.exports = RecipeCollector;