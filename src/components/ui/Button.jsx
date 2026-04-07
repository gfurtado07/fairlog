import React from 'react';
import clsx from 'clsx';

const Button = React.forwardRef(({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  className,
  children,
  ...props
}, ref) => {
  const variants = {
    primary: 'bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold',
    secondary: 'bg-transparent border border-surface-light hover:border-amber-500 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white font-semibold',
    ghost: 'bg-transparent hover:bg-surface text-white',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[44px]',
    md: 'px-4 py-2.5 text-base min-h-[44px]',
    lg: 'px-6 py-3 text-lg min-h-[44px]',
  };

  const baseClasses = clsx(
    'inline-flex items-center justify-center gap-2',
    'rounded-lg transition-colors duration-200',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className
  );

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={baseClasses}
      {...props}
    >
      {loading && (
        <svg
          className="w-4 h-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
