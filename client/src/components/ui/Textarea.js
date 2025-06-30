import React from 'react';

const Textarea = ({ 
  label,
  error,
  helper,
  className = '',
  placeholder,
  required = false,
  rows = 3,
  ...props 
}) => {
  const textareaClass = error ? 'input-error' : 'input-style';
  
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-neutral-700">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <textarea
        placeholder={placeholder}
        rows={rows}
        className={`${textareaClass} ${className}`}
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

export default Textarea;