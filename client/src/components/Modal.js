import React from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
      <div className="relative mx-auto w-full max-w-lg">
        <div className="card p-6 animate-scale-in">
          <div className="flex justify-between items-center pb-4 border-b border-neutral-200">
            <h3 className="heading-sm text-neutral-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg text-sm p-2 transition-colors duration-200"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
