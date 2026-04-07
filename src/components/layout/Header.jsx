import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SyncIndicator from '../ui/SyncIndicator';
import { useSync } from '../../context/SyncContext';

export default function Header({ title, showBack = false, rightAction, eventId }) {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-surface border-b border-gray-800 z-50 flex items-center justify-between px-4">
      {/* Left: Back button */}
      <div className="w-10 h-10 flex items-center justify-center">
        {showBack && (
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5 text-gray-300" />
          </button>
        )}
      </div>

      {/* Center: Title */}
      <h1 className="flex-1 text-center text-lg font-semibold text-gray-100 truncate">
        {title}
      </h1>

      {/* Right: Action slot or SyncIndicator */}
      <div className="w-10 h-10 flex items-center justify-end">
        {eventId ? (
          <SyncIndicator eventId={eventId} />
        ) : (
          rightAction && <div className="flex items-center">{rightAction}</div>
        )}
      </div>
    </header>
  );
}
