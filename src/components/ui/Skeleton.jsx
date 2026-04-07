import React from 'react';
import clsx from 'clsx';

const Skeleton = ({
  className,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'bg-surface-light rounded-lg',
        'animate-pulse',
        className
      )}
      {...props}
    />
  );
};

export default Skeleton;
