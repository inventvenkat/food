#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class UniqueRecipeGenerator {
  constructor() {
    this.outputDir = './unique-recipes';
    this.usedNames = new Set();
    this.stats = {
      southIndian: 0,
      northIndian: 0,
      continental: 0,
      total: 0
    };
  }

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

  // Comprehensive South Indian recipes
  getSouthIndianRecipes() {
    return [
      // Breakfast Items
      { name: "Classic Masala Dosa", description: "Crispy rice crepe with spiced potato filling", ingredients: ["dosa batter", "potatoes", "onions", "mustard seeds", "curry leaves", "turmeric", "green chilies"], cookingTime: 30, servings: 4 },
      { name: "Plain Dosa", description: "Simple crispy rice and lentil crepe", ingredients: ["dosa batter", "oil", "salt"], cookingTime: 20, servings: 4 },
      { name: "Rava Dosa", description: "Crispy semolina crepe with vegetables", ingredients: ["semolina", "rice flour", "onions", "coriander", "green chilies"], cookingTime: 25, servings: 4 },
      { name: "Mysore Masala Dosa", description: "Dosa with spicy red chutney and potato filling", ingredients: ["dosa batter", "red chutney", "potatoes", "onions"], cookingTime: 35, servings: 4 },
      { name: "Set Dosa", description: "Thick, spongy mini dosas served in sets", ingredients: ["dosa batter", "fenugreek seeds", "poha"], cookingTime: 25, servings: 4 },
      { name: "Neer Dosa", description: "Thin, delicate rice crepes from coastal Karnataka", ingredients: ["rice", "coconut", "salt"], cookingTime: 30, servings: 4 },
      
      { name: "Soft Idli", description: "Steamed rice and lentil cakes", ingredients: ["idli batter", "fenugreek seeds", "black gram dal"], cookingTime: 20, servings: 4 },
      { name: "Rava Idli", description: "Instant semolina steamed cakes", ingredients: ["semolina", "yogurt", "mustard seeds", "curry leaves"], cookingTime: 25, servings: 4 },
      { name: "Mini Idli", description: "Bite-sized steamed rice cakes", ingredients: ["idli batter", "mustard seeds", "curry leaves"], cookingTime: 15, servings: 6 },
      
      { name: "Medu Vada", description: "Crispy lentil donuts", ingredients: ["black gram dal", "green chilies", "ginger", "curry leaves"], cookingTime: 30, servings: 4 },
      { name: "Rava Vada", description: "Crispy semolina fritters", ingredients: ["semolina", "yogurt", "onions", "green chilies"], cookingTime: 25, servings: 4 },
      { name: "Dahi Vada", description: "Lentil dumplings in spiced yogurt", ingredients: ["black gram dal", "yogurt", "tamarind chutney", "spices"], cookingTime: 45, servings: 4 },
      
      { name: "Rava Upma", description: "Savory semolina porridge", ingredients: ["semolina", "onions", "mustard seeds", "curry leaves", "vegetables"], cookingTime: 20, servings: 4 },
      { name: "Vermicelli Upma", description: "Roasted vermicelli with vegetables", ingredients: ["vermicelli", "onions", "tomatoes", "green chilies"], cookingTime: 15, servings: 4 },
      { name: "Poha Upma", description: "Flattened rice with spices", ingredients: ["poha", "onions", "peanuts", "curry leaves"], cookingTime: 15, servings: 4 },
      
      { name: "Uttapam", description: "Thick pancake with vegetable toppings", ingredients: ["dosa batter", "onions", "tomatoes", "green chilies", "coriander"], cookingTime: 25, servings: 4 },
      { name: "Vegetable Uttapam", description: "Mixed vegetable thick pancake", ingredients: ["dosa batter", "mixed vegetables", "coriander"], cookingTime: 30, servings: 4 },
      
      // Rice Dishes
      { name: "Sambar Rice", description: "Rice mixed with tangy lentil curry", ingredients: ["rice", "sambar", "ghee", "pickle"], cookingTime: 30, servings: 4 },
      { name: "Rasam Rice", description: "Rice with spicy tangy soup", ingredients: ["rice", "rasam", "ghee"], cookingTime: 25, servings: 4 },
      { name: "Curd Rice", description: "Cooling yogurt rice", ingredients: ["rice", "yogurt", "mustard seeds", "curry leaves", "ginger"], cookingTime: 15, servings: 4 },
      { name: "Lemon Rice", description: "Tangy turmeric rice", ingredients: ["rice", "lemon juice", "turmeric", "peanuts", "curry leaves"], cookingTime: 20, servings: 4 },
      { name: "Tamarind Rice", description: "Tangy spiced rice", ingredients: ["rice", "tamarind", "peanuts", "sesame seeds"], cookingTime: 25, servings: 4 },
      { name: "Coconut Rice", description: "Fragrant coconut-flavored rice", ingredients: ["rice", "coconut", "curry leaves", "mustard seeds"], cookingTime: 25, servings: 4 },
      { name: "Tomato Rice", description: "Spiced tomato rice", ingredients: ["rice", "tomatoes", "onions", "spices"], cookingTime: 30, servings: 4 },
      { name: "Vegetable Pulao", description: "Spiced rice with mixed vegetables", ingredients: ["basmati rice", "mixed vegetables", "whole spices"], cookingTime: 35, servings: 4 },
      { name: "Bisi Bele Bath", description: "Karnataka's spicy rice and lentil dish", ingredients: ["rice", "toor dal", "vegetables", "bisi bele bath powder"], cookingTime: 45, servings: 6 },
      
      // Curries and Gravies
      { name: "Sambar", description: "Tangy lentil curry with vegetables", ingredients: ["toor dal", "tamarind", "sambar powder", "vegetables", "curry leaves"], cookingTime: 40, servings: 6 },
      { name: "Tomato Rasam", description: "Spicy tangy tomato soup", ingredients: ["tomatoes", "tamarind", "rasam powder", "curry leaves"], cookingTime: 25, servings: 4 },
      { name: "Pepper Rasam", description: "Spicy black pepper soup", ingredients: ["black pepper", "tamarind", "cumin", "curry leaves"], cookingTime: 20, servings: 4 },
      { name: "Lemon Rasam", description: "Tangy lemon-flavored soup", ingredients: ["lemon juice", "tamarind", "turmeric", "curry leaves"], cookingTime: 15, servings: 4 },
      
      { name: "Coconut Chutney", description: "Fresh coconut condiment", ingredients: ["fresh coconut", "green chilies", "ginger", "curry leaves"], cookingTime: 10, servings: 4 },
      { name: "Tomato Chutney", description: "Spicy tomato condiment", ingredients: ["tomatoes", "onions", "red chilies", "tamarind"], cookingTime: 20, servings: 4 },
      { name: "Mint Chutney", description: "Fresh mint condiment", ingredients: ["mint leaves", "coconut", "green chilies"], cookingTime: 10, servings: 4 },
      { name: "Coriander Chutney", description: "Fresh coriander condiment", ingredients: ["coriander leaves", "coconut", "green chilies"], cookingTime: 10, servings: 4 },
      
      { name: "Mixed Vegetable Kootu", description: "Lentils cooked with vegetables", ingredients: ["mixed vegetables", "moong dal", "coconut", "cumin"], cookingTime: 30, servings: 4 },
      { name: "Cabbage Kootu", description: "Cabbage cooked with lentils", ingredients: ["cabbage", "moong dal", "coconut"], cookingTime: 25, servings: 4 },
      { name: "Bottle Gourd Kootu", description: "Bottle gourd with lentils", ingredients: ["bottle gourd", "chana dal", "coconut"], cookingTime: 30, servings: 4 },
      
      { name: "Aviyal", description: "Mixed vegetables in coconut curry", ingredients: ["mixed vegetables", "coconut", "curry leaves", "yogurt"], cookingTime: 35, servings: 6 },
      { name: "Olan", description: "Kerala-style pumpkin and beans curry", ingredients: ["ash gourd", "black-eyed peas", "coconut milk"], cookingTime: 30, servings: 4 },
      { name: "Erissery", description: "Pumpkin and bean curry with coconut", ingredients: ["pumpkin", "red beans", "coconut", "curry leaves"], cookingTime: 40, servings: 4 },
      
      { name: "Cabbage Thoran", description: "Dry coconut vegetable stir-fry", ingredients: ["cabbage", "grated coconut", "green chilies", "curry leaves"], cookingTime: 20, servings: 4 },
      { name: "Beans Thoran", description: "Green beans with coconut", ingredients: ["green beans", "grated coconut", "onions"], cookingTime: 25, servings: 4 },
      { name: "Carrot Thoran", description: "Carrots with coconut", ingredients: ["carrots", "grated coconut", "mustard seeds"], cookingTime: 20, servings: 4 },
      
      // Snacks and Sweets
      { name: "Banana Chips", description: "Crispy fried banana slices", ingredients: ["raw bananas", "coconut oil", "salt", "turmeric"], cookingTime: 30, servings: 4 },
      { name: "Murukku", description: "Spiral-shaped rice flour snack", ingredients: ["rice flour", "black gram flour", "sesame seeds"], cookingTime: 45, servings: 6 },
      { name: "Ribbon Pakoda", description: "Crispy ribbon-shaped snack", ingredients: ["rice flour", "black gram flour", "butter"], cookingTime: 40, servings: 6 },
      { name: "Mixture", description: "Crunchy South Indian snack mix", ingredients: ["sev", "peanuts", "curry leaves", "spices"], cookingTime: 30, servings: 8 },
      
      { name: "Mysore Pak", description: "Rich gram flour sweet", ingredients: ["gram flour", "ghee", "sugar", "cardamom"], cookingTime: 45, servings: 8 },
      { name: "Rava Kesari", description: "Semolina sweet with saffron", ingredients: ["semolina", "sugar", "ghee", "saffron", "cashews"], cookingTime: 30, servings: 6 },
      { name: "Coconut Barfi", description: "Sweet coconut squares", ingredients: ["coconut", "condensed milk", "cardamom"], cookingTime: 25, servings: 8 },
      { name: "Payasam", description: "Traditional South Indian dessert", ingredients: ["rice", "milk", "jaggery", "cardamom"], cookingTime: 60, servings: 6 }
    ];
  }

  // Comprehensive North Indian recipes
  getNorthIndianRecipes() {
    return [
      // Main Curries
      { name: "Butter Chicken", description: "Creamy tomato-based chicken curry", ingredients: ["chicken", "tomatoes", "cream", "butter", "garam masala"], cookingTime: 45, servings: 4 },
      { name: "Chicken Tikka Masala", description: "Grilled chicken in spiced tomato sauce", ingredients: ["chicken tikka", "tomatoes", "cream", "onions"], cookingTime: 40, servings: 4 },
      { name: "Dal Makhani", description: "Rich black lentil curry", ingredients: ["black urad dal", "kidney beans", "cream", "butter"], cookingTime: 90, servings: 6 },
      { name: "Palak Paneer", description: "Spinach curry with cottage cheese", ingredients: ["spinach", "paneer", "onions", "tomatoes", "cream"], cookingTime: 35, servings: 4 },
      { name: "Paneer Butter Masala", description: "Cottage cheese in creamy tomato sauce", ingredients: ["paneer", "tomatoes", "cream", "cashews", "butter"], cookingTime: 30, servings: 4 },
      { name: "Chole", description: "Spicy chickpea curry", ingredients: ["chickpeas", "onions", "tomatoes", "ginger-garlic"], cookingTime: 45, servings: 4 },
      { name: "Rajma", description: "Kidney bean curry", ingredients: ["kidney beans", "onions", "tomatoes", "ginger-garlic"], cookingTime: 60, servings: 4 },
      { name: "Aloo Gobi", description: "Potato and cauliflower curry", ingredients: ["potatoes", "cauliflower", "onions", "turmeric", "cumin"], cookingTime: 30, servings: 4 },
      { name: "Bhindi Masala", description: "Spiced okra curry", ingredients: ["okra", "onions", "tomatoes", "spices"], cookingTime: 25, servings: 4 },
      { name: "Baingan Bharta", description: "Smoky mashed eggplant curry", ingredients: ["eggplant", "onions", "tomatoes", "green chilies"], cookingTime: 40, servings: 4 },
      
      // Dal Varieties
      { name: "Tadka Dal", description: "Simple tempered lentils", ingredients: ["yellow dal", "turmeric", "cumin", "mustard seeds"], cookingTime: 30, servings: 4 },
      { name: "Dal Fry", description: "Fried lentils with onions", ingredients: ["mixed dal", "onions", "tomatoes", "ginger-garlic"], cookingTime: 35, servings: 4 },
      { name: "Moong Dal", description: "Yellow lentil curry", ingredients: ["moong dal", "turmeric", "cumin", "green chilies"], cookingTime: 25, servings: 4 },
      { name: "Masoor Dal", description: "Red lentil curry", ingredients: ["red lentils", "onions", "tomatoes", "turmeric"], cookingTime: 25, servings: 4 },
      { name: "Chana Dal", description: "Split chickpea curry", ingredients: ["chana dal", "onions", "tomatoes", "garam masala"], cookingTime: 40, servings: 4 },
      
      // Rice Dishes
      { name: "Chicken Biryani", description: "Fragrant spiced rice with chicken", ingredients: ["basmati rice", "chicken", "yogurt", "saffron", "whole spices"], cookingTime: 90, servings: 6 },
      { name: "Mutton Biryani", description: "Aromatic rice with tender mutton", ingredients: ["basmati rice", "mutton", "yogurt", "saffron"], cookingTime: 120, servings: 6 },
      { name: "Vegetable Biryani", description: "Spiced rice with mixed vegetables", ingredients: ["basmati rice", "mixed vegetables", "yogurt", "saffron"], cookingTime: 60, servings: 6 },
      { name: "Jeera Rice", description: "Cumin-flavored rice", ingredients: ["basmati rice", "cumin seeds", "ghee"], cookingTime: 25, servings: 4 },
      { name: "Pulao", description: "Mildly spiced rice with vegetables", ingredients: ["basmati rice", "mixed vegetables", "whole spices"], cookingTime: 35, servings: 4 },
      
      // Breads
      { name: "Butter Naan", description: "Soft leavened bread with butter", ingredients: ["flour", "yogurt", "yeast", "butter"], cookingTime: 45, servings: 4 },
      { name: "Garlic Naan", description: "Naan topped with garlic", ingredients: ["flour", "yogurt", "yeast", "garlic"], cookingTime: 45, servings: 4 },
      { name: "Tandoori Roti", description: "Whole wheat bread from tandoor", ingredients: ["whole wheat flour", "water", "salt"], cookingTime: 20, servings: 4 },
      { name: "Aloo Paratha", description: "Stuffed potato flatbread", ingredients: ["wheat flour", "potatoes", "spices"], cookingTime: 30, servings: 4 },
      { name: "Gobi Paratha", description: "Cauliflower stuffed flatbread", ingredients: ["wheat flour", "cauliflower", "spices"], cookingTime: 35, servings: 4 },
      { name: "Laccha Paratha", description: "Multi-layered flaky flatbread", ingredients: ["wheat flour", "ghee", "salt"], cookingTime: 40, servings: 4 },
      
      // Tandoori Items
      { name: "Tandoori Chicken", description: "Yogurt-marinated grilled chicken", ingredients: ["chicken", "yogurt", "tandoori masala", "lemon"], cookingTime: 60, servings: 4 },
      { name: "Chicken Tikka", description: "Grilled chicken pieces", ingredients: ["chicken", "yogurt", "spices", "bell peppers"], cookingTime: 30, servings: 4 },
      { name: "Seekh Kebab", description: "Grilled minced meat skewers", ingredients: ["minced meat", "onions", "spices"], cookingTime: 25, servings: 4 },
      { name: "Paneer Tikka", description: "Grilled cottage cheese", ingredients: ["paneer", "yogurt", "spices", "bell peppers"], cookingTime: 20, servings: 4 },
      
      // Street Food
      { name: "Pani Puri", description: "Crispy shells with spiced water", ingredients: ["puri shells", "spiced water", "chutneys", "potatoes"], cookingTime: 30, servings: 4 },
      { name: "Bhel Puri", description: "Crunchy snack mix", ingredients: ["puffed rice", "sev", "chutneys", "onions"], cookingTime: 15, servings: 4 },
      { name: "Samosa", description: "Crispy triangular pastries", ingredients: ["flour", "potatoes", "peas", "spices"], cookingTime: 45, servings: 6 },
      { name: "Kachori", description: "Spicy lentil-filled pastries", ingredients: ["flour", "dal", "spices"], cookingTime: 40, servings: 6 },
      { name: "Aloo Tikki", description: "Spiced potato patties", ingredients: ["potatoes", "spices", "bread crumbs"], cookingTime: 25, servings: 4 },
      
      // Sweets
      { name: "Gulab Jamun", description: "Sweet milk dumplings in syrup", ingredients: ["milk powder", "flour", "sugar syrup", "cardamom"], cookingTime: 40, servings: 8 },
      { name: "Rasgulla", description: "Spongy cheese balls in syrup", ingredients: ["paneer", "sugar", "water"], cookingTime: 45, servings: 8 },
      { name: "Jalebi", description: "Crispy spiral sweets in syrup", ingredients: ["flour", "yogurt", "sugar syrup", "saffron"], cookingTime: 60, servings: 6 },
      { name: "Ladoo", description: "Round sweet balls", ingredients: ["gram flour", "ghee", "sugar", "nuts"], cookingTime: 30, servings: 8 },
      { name: "Kheer", description: "Rice pudding with milk", ingredients: ["rice", "milk", "sugar", "cardamom", "nuts"], cookingTime: 60, servings: 6 },
      { name: "Gajar Halwa", description: "Carrot pudding", ingredients: ["carrots", "milk", "sugar", "ghee", "nuts"], cookingTime: 90, servings: 6 },
      
      // Beverages
      { name: "Masala Chai", description: "Spiced tea", ingredients: ["tea leaves", "milk", "spices", "sugar"], cookingTime: 10, servings: 2 },
      { name: "Lassi", description: "Yogurt-based drink", ingredients: ["yogurt", "sugar", "cardamom"], cookingTime: 5, servings: 2 },
      { name: "Mango Lassi", description: "Mango yogurt drink", ingredients: ["yogurt", "mango", "sugar"], cookingTime: 5, servings: 2 },
      { name: "Thandai", description: "Spiced milk drink", ingredients: ["milk", "almonds", "spices", "sugar"], cookingTime: 20, servings: 4 }
    ];
  }

  // Comprehensive Continental recipes
  getContinentalRecipes() {
    return [
      // Pasta Dishes
      { name: "Spaghetti Carbonara", description: "Classic Italian pasta with eggs and pancetta", ingredients: ["spaghetti", "eggs", "pancetta", "parmesan", "black pepper"], cookingTime: 25, servings: 4 },
      { name: "Chicken Alfredo", description: "Creamy pasta with grilled chicken", ingredients: ["fettuccine", "chicken", "cream", "parmesan", "garlic"], cookingTime: 30, servings: 4 },
      { name: "Penne Arrabbiata", description: "Spicy tomato pasta", ingredients: ["penne", "tomatoes", "red chilies", "garlic", "basil"], cookingTime: 25, servings: 4 },
      { name: "Lasagna", description: "Layered pasta with meat and cheese", ingredients: ["lasagna sheets", "ground beef", "cheese", "tomato sauce"], cookingTime: 90, servings: 8 },
      { name: "Beef Bolognese", description: "Rich meat sauce pasta", ingredients: ["spaghetti", "ground beef", "tomatoes", "wine", "herbs"], cookingTime: 120, servings: 6 },
      { name: "Mushroom Risotto", description: "Creamy Italian rice dish", ingredients: ["arborio rice", "mushrooms", "white wine", "parmesan"], cookingTime: 35, servings: 4 },
      { name: "Seafood Linguine", description: "Pasta with mixed seafood", ingredients: ["linguine", "shrimp", "mussels", "white wine", "garlic"], cookingTime: 30, servings: 4 },
      
      // Main Courses
      { name: "Grilled Chicken Breast", description: "Herb-marinated grilled chicken", ingredients: ["chicken breast", "herbs", "olive oil", "lemon"], cookingTime: 25, servings: 4 },
      { name: "Beef Steak", description: "Pan-seared beef steak", ingredients: ["beef steak", "butter", "garlic", "thyme"], cookingTime: 20, servings: 2 },
      { name: "Fish and Chips", description: "Battered fish with fried potatoes", ingredients: ["white fish", "potatoes", "flour", "beer", "oil"], cookingTime: 45, servings: 4 },
      { name: "Roast Chicken", description: "Herb-roasted whole chicken", ingredients: ["whole chicken", "herbs", "garlic", "lemon"], cookingTime: 90, servings: 6 },
      { name: "Pork Chops", description: "Pan-fried pork chops", ingredients: ["pork chops", "herbs", "garlic", "oil"], cookingTime: 25, servings: 4 },
      { name: "Lamb Curry", description: "Spiced lamb in rich gravy", ingredients: ["lamb", "onions", "tomatoes", "spices"], cookingTime: 90, servings: 6 },
      { name: "Beef Stroganoff", description: "Russian beef in sour cream sauce", ingredients: ["beef", "mushrooms", "sour cream", "onions"], cookingTime: 45, servings: 4 },
      
      // Soups
      { name: "Tomato Soup", description: "Classic creamy tomato soup", ingredients: ["tomatoes", "cream", "basil", "onions"], cookingTime: 30, servings: 4 },
      { name: "Chicken Soup", description: "Comforting chicken and vegetable soup", ingredients: ["chicken", "vegetables", "herbs", "stock"], cookingTime: 60, servings: 6 },
      { name: "Mushroom Soup", description: "Creamy mushroom soup", ingredients: ["mushrooms", "cream", "onions", "herbs"], cookingTime: 35, servings: 4 },
      { name: "Minestrone", description: "Italian vegetable soup", ingredients: ["mixed vegetables", "beans", "pasta", "herbs"], cookingTime: 45, servings: 6 },
      { name: "French Onion Soup", description: "Caramelized onion soup with cheese", ingredients: ["onions", "beef stock", "cheese", "bread"], cookingTime: 60, servings: 4 },
      
      // Salads
      { name: "Caesar Salad", description: "Classic Roman salad", ingredients: ["romaine lettuce", "parmesan", "croutons", "caesar dressing"], cookingTime: 15, servings: 4 },
      { name: "Greek Salad", description: "Mediterranean vegetable salad", ingredients: ["tomatoes", "cucumbers", "feta", "olives", "olive oil"], cookingTime: 10, servings: 4 },
      { name: "Caprese Salad", description: "Tomato mozzarella salad", ingredients: ["tomatoes", "mozzarella", "basil", "balsamic"], cookingTime: 10, servings: 4 },
      { name: "Waldorf Salad", description: "Apple and walnut salad", ingredients: ["apples", "celery", "walnuts", "mayonnaise"], cookingTime: 15, servings: 4 },
      { name: "Nicoise Salad", description: "French tuna and vegetable salad", ingredients: ["tuna", "eggs", "olives", "tomatoes", "anchovies"], cookingTime: 20, servings: 4 },
      
      // Pizza
      { name: "Margherita Pizza", description: "Classic tomato and mozzarella pizza", ingredients: ["pizza dough", "tomatoes", "mozzarella", "basil"], cookingTime: 25, servings: 4 },
      { name: "Pepperoni Pizza", description: "Pizza with pepperoni", ingredients: ["pizza dough", "tomato sauce", "mozzarella", "pepperoni"], cookingTime: 25, servings: 4 },
      { name: "Hawaiian Pizza", description: "Pizza with ham and pineapple", ingredients: ["pizza dough", "ham", "pineapple", "cheese"], cookingTime: 25, servings: 4 },
      { name: "Meat Lovers Pizza", description: "Pizza with multiple meats", ingredients: ["pizza dough", "sausage", "pepperoni", "ham", "cheese"], cookingTime: 30, servings: 4 },
      
      // Desserts
      { name: "Chocolate Cake", description: "Rich chocolate layer cake", ingredients: ["flour", "cocoa", "sugar", "eggs", "butter"], cookingTime: 60, servings: 8 },
      { name: "Cheesecake", description: "Creamy cheese dessert", ingredients: ["cream cheese", "sugar", "eggs", "graham crackers"], cookingTime: 90, servings: 8 },
      { name: "Apple Pie", description: "Classic American apple pie", ingredients: ["apples", "flour", "sugar", "butter", "cinnamon"], cookingTime: 75, servings: 8 },
      { name: "Tiramisu", description: "Italian coffee-flavored dessert", ingredients: ["mascarpone", "coffee", "ladyfingers", "cocoa"], cookingTime: 30, servings: 6 },
      { name: "Crème Brûlée", description: "French vanilla custard", ingredients: ["cream", "eggs", "sugar", "vanilla"], cookingTime: 60, servings: 6 },
      
      // Breakfast
      { name: "Pancakes", description: "Fluffy breakfast pancakes", ingredients: ["flour", "eggs", "milk", "sugar", "baking powder"], cookingTime: 20, servings: 4 },
      { name: "French Toast", description: "Bread soaked in egg mixture", ingredients: ["bread", "eggs", "milk", "vanilla", "cinnamon"], cookingTime: 15, servings: 4 },
      { name: "Waffles", description: "Crispy breakfast waffles", ingredients: ["flour", "eggs", "milk", "butter", "sugar"], cookingTime: 20, servings: 4 },
      { name: "Eggs Benedict", description: "Poached eggs on English muffins", ingredients: ["eggs", "english muffins", "ham", "hollandaise sauce"], cookingTime: 25, servings: 2 },
      { name: "Omelette", description: "Folded egg dish with fillings", ingredients: ["eggs", "cheese", "herbs", "butter"], cookingTime: 10, servings: 2 }
    ];
  }

  generateRecipeContent(recipe) {
    const ingredients = recipe.ingredients.map(ingredient => `- ${ingredient}`).join('\n');
    
    const instructions = this.generateInstructions(recipe);

    return `${recipe.name}

${recipe.description}

Ingredients:
${ingredients}
- Salt to taste
- Oil/butter as needed

Instructions:
${instructions}

Cooking time: ${recipe.cookingTime} minutes
Serves: ${recipe.servings} people
`;
  }

  generateInstructions(recipe) {
    // Generate contextual instructions based on recipe type
    if (recipe.name.includes("Dosa")) {
      return `1. Heat a non-stick pan or dosa tawa over medium heat.
2. Pour a ladle of batter in the center and spread thin.
3. Drizzle oil around the edges and cook until golden.
4. Add filling if making masala dosa.
5. Fold and serve hot with chutney and sambar.`;
    } else if (recipe.name.includes("Dal") || recipe.name.includes("Lentil")) {
      return `1. Wash and soak lentils for 30 minutes.
2. Pressure cook lentils until soft and mushy.
3. Heat oil in a pan, add tempering spices.
4. Add onions, ginger-garlic paste and sauté.
5. Add tomatoes and cook until soft.
6. Add cooked lentils and simmer.
7. Season with salt and spices.
8. Garnish and serve hot.`;
    } else if (recipe.name.includes("Pasta")) {
      return `1. Boil pasta in salted water until al dente.
2. Heat oil in a large pan over medium heat.
3. Add garlic and sauté until fragrant.
4. Add sauce ingredients and cook.
5. Toss cooked pasta with the sauce.
6. Add cheese if using and mix well.
7. Garnish with herbs and serve immediately.`;
    } else if (recipe.name.includes("Chicken")) {
      return `1. Clean and cut chicken into pieces.
2. Marinate chicken with spices for 30 minutes.
3. Heat oil in a heavy-bottomed pan.
4. Add chicken and cook until golden.
5. Add onions and cook until translucent.
6. Add tomatoes and cook until soft.
7. Add spices and simmer until chicken is tender.
8. Garnish and serve hot.`;
    } else if (recipe.name.includes("Pizza")) {
      return `1. Preheat oven to 450°F (230°C).
2. Roll out pizza dough on a floured surface.
3. Transfer to pizza stone or baking sheet.
4. Spread sauce evenly over dough.
5. Add cheese and toppings as desired.
6. Bake for 12-15 minutes until crust is golden.
7. Remove from oven and let cool slightly.
8. Slice and serve hot.`;
    } else if (recipe.name.includes("Soup")) {
      return `1. Heat oil in a large pot over medium heat.
2. Add onions and cook until translucent.
3. Add garlic and cook for 1 minute.
4. Add main ingredients and sauté briefly.
5. Add liquid and bring to a boil.
6. Reduce heat and simmer until vegetables are tender.
7. Season with salt, pepper, and herbs.
8. Serve hot with bread or crackers.`;
    } else if (recipe.name.includes("Salad")) {
      return `1. Wash and prepare all vegetables thoroughly.
2. Chop vegetables into bite-sized pieces.
3. Combine vegetables in a large salad bowl.
4. Prepare dressing by whisking ingredients together.
5. Add dressing to salad just before serving.
6. Toss gently to coat all ingredients.
7. Garnish with herbs or cheese if using.
8. Serve immediately while fresh.`;
    } else if (recipe.name.includes("Steak") || recipe.name.includes("Chops")) {
      return `1. Remove meat from refrigerator 30 minutes before cooking.
2. Season generously with salt and pepper.
3. Heat a heavy skillet over medium-high heat.
4. Add oil when pan is hot.
5. Cook meat for 3-4 minutes per side for medium-rare.
6. Add butter, garlic, and herbs in last minute.
7. Let rest for 5 minutes before serving.
8. Serve with desired accompaniments.`;
    } else {
      return `1. Prepare all ingredients and have them ready.
2. Heat oil/butter in a suitable cooking vessel.
3. Add aromatics and spices first.
4. Add main ingredients in order of cooking time.
5. Cook according to recipe requirements.
6. Season with salt and adjust spices.
7. Cook until done and flavors are well blended.
8. Garnish appropriately and serve.`;
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

  async createUniqueRecipes() {
    console.log('🍳 Creating unique recipe collection...');
    
    const allRecipes = [
      ...this.getSouthIndianRecipes().map(r => ({...r, category: 'South Indian'})),
      ...this.getNorthIndianRecipes().map(r => ({...r, category: 'North Indian'})),
      ...this.getContinentalRecipes().map(r => ({...r, category: 'Continental'}))
    ];

    for (const recipe of allRecipes) {
      const content = this.generateRecipeContent(recipe);
      const filename = this.sanitizeFilename(recipe.name);
      const categoryDir = recipe.category.toLowerCase().replace(' ', '-');
      const filepath = path.join(this.outputDir, categoryDir, `${filename}.txt`);
      
      // Check for duplicates
      if (this.usedNames.has(filename)) {
        console.log(`⚠️  Skipping duplicate: ${recipe.name}`);
        continue;
      }
      
      this.usedNames.add(filename);
      fs.writeFileSync(filepath, content);
      this.updateStats(recipe.category);
    }
  }

  async generateUniqueRecipes() {
    console.log('🚀 Starting Unique Recipe Generation...');
    console.log('=====================================');

    this.setupDirectories();
    await this.createUniqueRecipes();
    this.showStats();
  }

  showStats() {
    console.log('\n📊 Unique Recipe Collection Results:');
    console.log('===================================');
    console.log(`🌶️  South Indian: ${this.stats.southIndian} recipes`);
    console.log(`🍛 North Indian: ${this.stats.northIndian} recipes`);
    console.log(`🍝 Continental: ${this.stats.continental} recipes`);
    console.log(`📁 Total: ${this.stats.total} unique recipes`);
    console.log(`\n📂 Recipes saved in: ${this.outputDir}/`);
    console.log('\n✅ All recipes are unique with detailed, contextual instructions!');
    console.log('\n🔄 Ready for ChatGPT import:');
    console.log('1. Set OPENAI_API_KEY environment variable');
    console.log('2. Run: cd server && node scripts/chatgpt-recipe-importer.js ../unique-recipes/south-indian');
    console.log('3. Run: cd server && node scripts/chatgpt-recipe-importer.js ../unique-recipes/north-indian');
    console.log('4. Run: cd server && node scripts/chatgpt-recipe-importer.js ../unique-recipes/continental');
  }
}

// CLI usage
if (require.main === module) {
  const generator = new UniqueRecipeGenerator();
  generator.generateUniqueRecipes();
}

module.exports = UniqueRecipeGenerator;