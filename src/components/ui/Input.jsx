import React from 'react';
import clsx from 'clsx';

const Input = React.forwardRef(({
  label,
  error,
  helperText,
  className,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-200 mb-2">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={clsx(
          'w-full px-3 py-2 rounded-lg',
          'bg-surface border border-surface-light',
          'text-white placeholder-gray-500',
          'focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500',
          'transition-colors duration-200',
          error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-400">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
