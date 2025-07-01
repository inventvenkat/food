import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'base', 
  className = '', 
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  as: Component = 'button',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    ghost: 'btn-ghost'
  };
  
  const sizes = {
    sm: 'btn-sm',
    base: '',
    lg: 'btn-lg'
  };
  
  const variantClass = variants[variant] || variants.primary;
  const sizeClass = sizes[size] || '';
  
  // For button elements, include type and disabled props
  const buttonProps = Component === 'button' ? {
    type,
    disabled: disabled || loading,
    onClick
  } : { onClick };
  
  return (
    <Component
      {...buttonProps}
      className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </Component>
  );
};

export default Button;