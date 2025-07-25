import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  hover = false, 
  interactive = false,
  padding = 'p-6',
  ...props 
}) => {
  const baseClasses = 'card';
  const hoverClasses = hover ? 'card-hover' : '';
  const interactiveClasses = interactive ? 'card-interactive' : '';
  
  return (
    <div 
      className={`${baseClasses} ${hoverClasses} ${interactiveClasses} ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '' }) => (
  <h3 className={`heading-sm mb-2 ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ children, className = '' }) => (
  <div className={`${className}`}>
    {children}
  </div>
);

const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-4 pt-4 border-t border-neutral-200 ${className}`}>
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;