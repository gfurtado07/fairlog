import React from 'react';
import clsx from 'clsx';

const Select = React.forwardRef(({
  label,
  error,
  options = [],
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
      <select
        ref={ref}
        className={clsx(
          'w-full px-3 py-2 rounded-lg',
          'bg-surface border border-surface-light',
          'text-white',
          'focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500',
          'transition-colors duration-200',
          'appearance-none cursor-pointer',
          error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-surface text-white"
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
