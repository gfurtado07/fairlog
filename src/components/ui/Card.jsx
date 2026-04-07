import { cn } from '../../lib/utils';

export default function Card({ children, className = '' }) {
  return (
    <div
      className={cn(
        'rounded-lg bg-gray-800 border border-gray-700',
        className
      )}
    >
      {children}
    </div>
  );
}
