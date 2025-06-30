import React from 'react';

const Input = ({ 
  label,
  error,
  helper,
  size = 'base',
  className = '',
  type = 'text',
  placeholder,
  required = false,
  ...props 
}) => {
  const sizeClasses = {
    sm: 'input-style-sm',
    base: 'input-style'
  };
  
  const inputClass = error ? 'input-error' : sizeClasses[size];
  
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-neutral-700">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        className={`${inputClass} ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
      {helper && !error && (
        <p className="text-sm text-neutral-500">{helper}</p>
      )}
    </div>
  );
};

export default Input;