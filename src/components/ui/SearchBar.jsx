import React from 'react';
import { Search } from 'lucide-react';
import clsx from 'clsx';

const SearchBar = ({
  value,
  onChange,
  placeholder = 'Pesquisar...',
  className,
  ...props
}) => {
  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={clsx(
          'w-full pl-10 pr-4 py-2.5 rounded-lg',
          'bg-surface border border-surface-light',
          'text-white placeholder-gray-500',
          'focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500',
          'transition-colors duration-200',
          'min-h-[44px]',
          className
        )}
        {...props}
      />
    </div>
  );
};

export default SearchBar;
