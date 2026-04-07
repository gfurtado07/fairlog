import React, { useState } from 'react';
import { Star } from 'lucide-react';
import clsx from 'clsx';

const StarRating = ({
  value = 0,
  onChange,
  readOnly = false,
  size = 'md',
}) => {
  const [hoverValue, setHoverValue] = useState(0);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const handleClick = (rating) => {
    if (!readOnly && onChange) {
      onChange(rating);
    }
  };

  const displayValue = hoverValue || value;

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => handleClick(star)}
          onMouseEnter={() => !readOnly && setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          disabled={readOnly}
          className={clsx(
            'min-h-[44px] min-w-[44px] flex items-center justify-center',
            'transition-colors duration-200 rounded-lg',
            !readOnly && 'hover:bg-surface cursor-pointer',
            readOnly && 'cursor-default'
          )}
        >
          <Star
            className={clsx(
              sizeClasses[size],
              'transition-all duration-200',
              star <= displayValue
                ? 'fill-amber-500 text-amber-500'
                : 'text-gray-600'
            )}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
