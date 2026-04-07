import React from 'react';

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {Icon && (
        <div className="mb-4 p-3 rounded-full bg-surface-light">
          <Icon className="w-8 h-8 text-amber-500" />
        </div>
      )}
      {title && (
        <h3 className="text-lg font-semibold text-white mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-gray-400 text-center mb-6 max-w-xs">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
