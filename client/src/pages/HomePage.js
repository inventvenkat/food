import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Badge } from '../components/ui';
import RecipeAppLogo from '../assets/recipe-app-logo.svg';

const HomePage = () => {
  const features = [
    {
      icon: "📝",
      title: "Smart Recipe Creation",
      description: "Create recipes with AI-powered assistance. Upload documents or paste text and let our LLM help format everything perfectly."
    },
    {
      icon: "🔍",
      title: "Discover & Explore",
      description: "Browse thousands of curated recipes from our growing community. Find your next favorite dish."
    },
    {
      icon: "📅",
      title: "Meal Planning",
      description: "Plan your weekly meals with ease. Generate shopping lists automatically from your meal plans."
    },
    {
      icon: "📚",
      title: "Collections",
      description: "Organize recipes into custom collections. Share your favorite recipe collections with friends."
    }
  ];

  const quickActions = [
    {
      title: "Create Your First Recipe",
      description: "Start building your recipe collection",
      action: "Create Recipe",
      to: "/create-recipe",
      variant: "primary"
    },
    {
      title: "Explore Public Recipes",
      description: "Discover amazing recipes from our community",
      action: "Browse Recipes",
      to: "/discover",
      variant: "outline"
    },
    {
      title: "Plan Your Meals",
      description: "Organize your weekly meal schedule",
      action: "Meal Planner",
      to: "/meal-planner",
      variant: "outline"
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <div className="container-app">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo */}
            <div className="mb-8">
              <img 
                src={RecipeAppLogo} 
                alt="RecipeApp Logo" 
                className="w-32 h-32 mx-auto mb-4"
              />
            </div>
            
            <Badge variant="primary" size="lg" className="mb-6">
              🎉 Welcome to RecipeApp
            </Badge>
            
            <h1 className="heading-xl mb-6">
              Your Personal Recipe Management & 
              <span className="text-primary-600"> Meal Planning</span> Assistant
            </h1>
            
            <p className="body-lg mb-8 max-w-2xl mx-auto">
              Create, discover, and organize recipes with AI-powered assistance. 
              Plan your meals, build collections, and never run out of cooking inspiration.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button as={Link} to="/create-recipe" size="lg" className="!no-underline">
                🚀 Create Your First Recipe
              </Button>
              <Button as={Link} to="/discover" variant="outline" size="lg" className="!no-underline">
                🔍 Explore Recipes
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding">
        <div className="container-app">
          <div className="text-center mb-12">
            <h2 className="heading-lg mb-4">Everything You Need for Recipe Management</h2>
            <p className="body-lg max-w-2xl mx-auto">
              From AI-powered recipe creation to smart meal planning, we've got all the tools you need.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} hover className="text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <Card.Title>{feature.title}</Card.Title>
                <Card.Content>
                  <p className="body-base">{feature.description}</p>
                </Card.Content>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="section-padding bg-white">
        <div className="container-app">
          <div className="text-center mb-12">
            <h2 className="heading-lg mb-4">Get Started in Minutes</h2>
            <p className="body-lg max-w-2xl mx-auto">
              Jump right in with these popular actions. Everything is designed to be simple and intuitive.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {quickActions.map((action, index) => (
              <Card key={index} interactive padding="p-8">
                <Card.Title className="mb-3">{action.title}</Card.Title>
                <Card.Content>
                  <p className="body-base mb-6">{action.description}</p>
                  <Button 
                    as={Link} 
                    to={action.to} 
                    variant={action.variant}
                    className="w-full !no-underline"
                  >
                    {action.action}
                  </Button>
                </Card.Content>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-r from-primary-500 to-secondary-500">
        <div className="container-app">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="heading-lg mb-4">Ready to Transform Your Cooking?</h2>
            <p className="body-lg mb-8 text-primary-100">
              Join thousands of home cooks who are already using RecipeApp to organize their kitchen and discover amazing new dishes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                as={Link} 
                to="/register" 
                variant="secondary"
                size="lg"
                className="!no-underline bg-white text-primary-700 hover:bg-neutral-50"
              >
                Get Started Free
              </Button>
              <Button 
                as={Link} 
                to="/discover" 
                variant="outline"
                size="lg"
                className="!no-underline border-white text-white hover:bg-white/10"
              >
                Browse Recipes
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-neutral-100">
        <div className="container-app">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="heading-md text-primary-600 mb-2">1000+</div>
              <p className="body-base">Curated Recipes</p>
            </div>
            <div>
              <div className="heading-md text-secondary-600 mb-2">5min</div>
              <p className="body-base">Average Setup Time</p>
            </div>
            <div>
              <div className="heading-md text-primary-600 mb-2">∞</div>
              <p className="body-base">Cooking Possibilities</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
