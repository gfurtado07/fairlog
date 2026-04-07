import React from 'react';
import clsx from 'clsx';

const Badge = ({
  variant = 'gray',
  className,
  children,
  ...props
}) => {
  const variants = {
    amber: 'bg-amber-500/20 text-amber-100 border border-amber-500/50',
    green: 'bg-green-500/20 text-green-100 border border-green-500/50',
    red: 'bg-red-500/20 text-red-100 border border-red-500/50',
    blue: 'bg-blue-500/20 text-blue-100 border border-blue-500/50',
    gray: 'bg-gray-500/20 text-gray-100 border border-gray-500/50',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-1 rounded-full',
        'text-xs font-semibold',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
