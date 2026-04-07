import React from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Modal Content */}
      <div
        className={clsx(
          'relative bg-surface rounded-lg shadow-xl',
          'border border-surface-light',
          'w-full',
          sizes[size],
          'max-h-[90vh] overflow-y-auto'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-light">
          {title && (
            <h2 className="text-xl font-semibold text-white">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className={clsx(
              'p-1 hover:bg-surface-light rounded-lg',
              'transition-colors duration-200',
              'min-h-[44px] min-w-[44px] flex items-center justify-center'
            )}
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
