import { LayoutDashboard, Search, Star, Download, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { label: 'Dashboard', icon: LayoutDashboard, path: (eventId) => `/events/${eventId}` },
  { label: 'Explorar', icon: Search, path: (eventId) => `/events/${eventId}/explore` },
  { label: 'Shortlist', icon: Star, path: (eventId) => `/events/${eventId}/shortlist` },
  { label: 'Exportar', icon: Download, path: (eventId) => `/events/${eventId}/export` },
  { label: 'Config', icon: Settings, path: (eventId) => `/events/${eventId}/settings` },
];

export default function BottomNav({ eventId }) {
  const location = useLocation();
  const navigate = useNavigate();

  if (!eventId) return null;

  const isActive = (tabPath) => {
    const currentPath = tabPath(eventId);
    // For dashboard, match exactly /events/{eventId} without trailing paths
    if (currentPath === `/events/${eventId}`) {
      return location.pathname === `/events/${eventId}`;
    }
    return location.pathname.startsWith(currentPath);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-800 z-40 pb-safe">
      <div className="flex h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);

          return (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path(eventId))}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
                active
                  ? 'text-amber-500 bg-gray-900/50'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
