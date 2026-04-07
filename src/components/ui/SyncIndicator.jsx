import React from 'react';
import clsx from 'clsx';

const SyncIndicator = ({
  status = 'online',
  pendingCount = 0,
}) => {
  const statusConfig = {
    online: {
      dot: 'bg-green-500',
      label: 'Online',
    },
    offline: {
      dot: 'bg-red-500',
      label: 'Offline',
    },
    syncing: {
      dot: 'bg-yellow-500 animate-pulse',
      label: 'Sincronizando',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      {/* Status Dot */}
      <div
        className={clsx(
          'w-2.5 h-2.5 rounded-full',
          config.dot
        )}
      />

      {/* Status Text */}
      <span className="text-xs font-medium text-gray-400">
        {config.label}
      </span>

      {/* Pending Count */}
      {pendingCount > 0 && (
        <span className="text-xs font-semibold text-amber-500 ml-1">
          ({pendingCount} pendente{pendingCount !== 1 ? 's' : ''})
        </span>
      )}
    </div>
  );
};

export default SyncIndicator;
