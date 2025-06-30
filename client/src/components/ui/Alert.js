import React from 'react';

const Alert = ({ 
  children, 
  variant = 'info',
  className = '',
  onClose,
  ...props 
}) => {
  const variants = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  };
  
  const icons = {
    info: '📘',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  const variantClass = variants[variant] || variants.info;
  const icon = icons[variant] || icons.info;
  
  return (
    <div 
      className={`border rounded-xl p-4 flex items-start space-x-3 ${variantClass} ${className}`}
      role="alert"
      {...props}
    >
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        {children}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-current hover:opacity-75 transition-opacity"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Alert;