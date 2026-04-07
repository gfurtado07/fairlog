import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSync } from '../context/SyncContext';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import { Plus, CalendarDays, MapPin } from 'lucide-react';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';

const EventCard = ({ event, onClick }) => {
  const isActive = () => {
    const now = new Date();
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    return now >= start && now <= end;
  };

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options = { day: '2-digit', month: '2-digit' };
    return `${start.toLocaleDateString('pt-BR', options)} - ${end.toLocaleDateString('pt-BR', options)}`;
  };

  const active = isActive();

  return (
    <div
      onClick={onClick}
      className="bg-[#1a1d27] rounded-lg p-6 cursor-pointer transition-all hover:bg-[#242836] hover:shadow-lg border border-[#242836]"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex-1">{event.name}</h3>
        <span
          className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap ml-2 ${
            active
              ? 'bg-green-500/20 text-green-400'
              : 'bg-gray-700/50 text-gray-400'
          }`}
        >
          {active ? 'Ativo' : 'Encerrado'}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-gray-300 text-sm">
          <MapPin className="w-4 h-4 text-[#f59e0b]" />
          <span>{event.location || 'Local não especificado'}</span>
          <span className="ml-1">{event.country_flag || ''}</span>
        </div>

        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <CalendarDays className="w-4 h-4 text-[#f59e0b]" />
          <span>{formatDateRange(event.start_date, event.end_date)}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-[#242836] text-sm text-gray-400">
        <span>{event.supplier_count || 0} fornecedores</span>
        <span className="mx-1">·</span>
        <span>{event.product_count || 0} produtos</span>
      </div>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="bg-[#1a1d27] rounded-lg p-6 border border-[#242836]">
    <div className="space-y-4">
      <div className="h-6 bg-[#242836] rounded w-3/4 animate-pulse" />
      <div className="h-4 bg-[#242836] rounded w-1/2 animate-pulse" />
      <div className="h-4 bg-[#242836] rounded w-2/3 animate-pulse" />
      <div className="h-4 bg-[#242836] rounded w-1/3 animate-pulse" />
    </div>
  </div>
);

export default function HomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isOnline } = useSync();
  const [userEvents, setUserEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load events for current user
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);

        // Try to load from Dexie first
        let events = await db.events.toArray();

        // If empty and online, fetch from Supabase
        if ((!events || events.length === 0) && isOnline) {
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('start_date', { ascending: false });

          if (error) throw error;
          events = data || [];

          // Cache in Dexie
          for (const event of events) {
            await db.events.put(event);
          }
        }

        // Filter and sort
        const filtered = (events || []).sort((a, b) => {
          const dateA = new Date(a.start_date || 0);
          const dateB = new Date(b.start_date || 0);
          return dateB - dateA;
        });

        setUserEvents(filtered);
      } catch (error) {
        console.error('Error loading events:', error);
        toast.error('Erro ao carregar eventos');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadEvents();
    }
  }, [user, isOnline]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Desconectado com sucesso');
      navigate('/login');
    } catch (error) {
      toast.error('Erro ao desconectar');
    }
  };

  const handleNewEvent = () => {
    navigate('/events/new');
  };

  const handleEventClick = (eventId) => {
    navigate(`/events/${eventId}`);
  };

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="fixed top-0 left-0 right-0 h-14 bg-[#1a1d27] border-b border-gray-800 z-50 flex items-center justify-between px-4">
        <h1 className="text-lg font-semibold text-white">FairLog</h1>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Sair
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-14">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Meus Eventos</h2>
          <p className="text-gray-400">Gerencie seus eventos e catálogos de feiras</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : userEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center">
              <CalendarDays className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Nenhum evento ainda</h3>
              <p className="text-gray-400 mb-6">Crie seu primeiro evento para começar</p>
              <Button onClick={handleNewEvent}>
                Criar Evento
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => handleEventClick(event.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      {userEvents.length > 0 && (
        <button
          onClick={handleNewEvent}
          className="fixed bottom-8 right-8 w-14 h-14 bg-[#f59e0b] hover:bg-[#f59e0b]/90 text-black rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
          aria-label="Novo evento"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
