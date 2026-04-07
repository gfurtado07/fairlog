import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSaveWithSync } from '../hooks/useOfflineSync';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import PageWrapper from '../components/layout/PageWrapper';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

const COUNTRIES = [
  { value: 'China', label: 'China', flag: '🇨🇳' },
  { value: 'Brasil', label: 'Brasil', flag: '🇧🇷' },
  { value: 'Turquia', label: 'Turquia', flag: '🇹🇷' },
  { value: 'Índia', label: 'Índia', flag: '🇮🇳' },
  { value: 'Vietnã', label: 'Vietnã', flag: '🇻🇳' },
  { value: 'Tailândia', label: 'Tailândia', flag: '🇹🇭' },
  { value: 'Indonésia', label: 'Indonésia', flag: '🇮🇩' },
  { value: 'Alemanha', label: 'Alemanha', flag: '🇩🇪' },
  { value: 'Itália', label: 'Itália', flag: '🇮🇹' },
  { value: 'EUA', label: 'EUA', flag: '🇺🇸' },
  { value: 'Espanha', label: 'Espanha', flag: '🇪🇸' },
  { value: 'França', label: 'França', flag: '🇫🇷' },
  { value: 'Reino Unido', label: 'Reino Unido', flag: '🇬🇧' },
  { value: 'Japão', label: 'Japão', flag: '🇯🇵' },
  { value: 'Coreia do Sul', label: 'Coreia do Sul', flag: '🇰🇷' },
  { value: 'México', label: 'México', flag: '🇲🇽' },
  { value: 'Canadá', label: 'Canadá', flag: '🇨🇦' },
  { value: 'Holanda', label: 'Holanda', flag: '🇳🇱' },
  { value: 'Bélgica', label: 'Bélgica', flag: '🇧🇪' },
  { value: 'Portugal', label: 'Portugal', flag: '🇵🇹' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD - Dólar Americano' },
  { value: 'CNY', label: 'CNY - Yuan Chinês' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'BRL', label: 'BRL - Real Brasileiro' },
  { value: 'GBP', label: 'GBP - Libra Esterlina' },
  { value: 'JPY', label: 'JPY - Iene Japonês' },
];

export default function EventFormPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { user } = useAuth();
  const { save, loading } = useSaveWithSync('events');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    country: '',
    currency: 'USD',
    start_date: '',
    end_date: '',
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load event data if editing
  useEffect(() => {
    if (eventId) {
      setIsEditing(true);
      // TODO: Load event data from Supabase or Dexie
      // const event = await db.events.get(eventId);
      // setFormData(event);
    }
  }, [eventId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Por favor, preencha o nome do evento');
      return false;
    }
    if (!formData.country) {
      toast.error('Por favor, selecione um país');
      return false;
    }
    if (!formData.start_date) {
      toast.error('Por favor, selecione a data de início');
      return false;
    }
    if (!formData.end_date) {
      toast.error('Por favor, selecione a data de fim');
      return false;
    }
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      toast.error('A data de início deve ser anterior à data de fim');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const eventData = {
        name: formData.name,
        location: formData.location,
        country: formData.country,
        currency: formData.currency,
        start_date: formData.start_date,
        end_date: formData.end_date,
        created_by: user.id,
      };

      let newEventId;
      if (isEditing && eventId) {
        // Update existing event
        await save(eventId, eventData);
        newEventId = eventId;
        toast.success('Evento atualizado com sucesso!');
      } else {
        // Create new event
        const result = await save(null, eventData);
        newEventId = result.id || result;

        // TODO: Add current user as admin in event_members
        // await db.event_members.add({
        //   event_id: newEventId,
        //   user_id: user.id,
        //   role: 'admin',
        // });

        toast.success('Evento criado com sucesso!');
      }

      navigate(`/events/${newEventId}`);
    } catch (error) {
      toast.error(error.message || 'Erro ao salvar evento');
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const countryFlag = formData.country
    ? COUNTRIES.find((c) => c.value === formData.country)?.flag || ''
    : '';

  return (
    <PageWrapper hasHeader={true}>
      <div className="min-h-screen bg-[#0f1117]">
        {/* Header with back button */}
        <div className="sticky top-0 z-40 bg-[#0f1117] border-b border-[#242836]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-white">
                {isEditing ? 'Editar Evento' : 'Novo Evento'}
              </h1>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Name */}
            <Input
              label="Nome do Evento"
              type="text"
              name="name"
              placeholder="Ex: Canton Fair 2026"
              value={formData.name}
              onChange={handleInputChange}
              required
              description="Digite o nome completo do evento"
            />

            {/* Location */}
            <Input
              label="Local"
              type="text"
              name="location"
              placeholder="Ex: Guangzhou"
              value={formData.location}
              onChange={handleInputChange}
              description="Cidade onde o evento ocorre"
            />

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                País *
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 bg-[#242836] border border-[#1a1d27] rounded-lg text-white focus:ring-2 focus:ring-[#f59e0b] focus:border-transparent transition-colors"
              >
                <option value="">Selecione um país</option>
                {COUNTRIES.map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.flag} {country.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Moeda Padrão
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-[#242836] border border-[#1a1d27] rounded-lg text-white focus:ring-2 focus:ring-[#f59e0b] focus:border-transparent transition-colors"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.value} value={currency.value}>
                    {currency.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Data Início"
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                required
              />
              <Input
                label="Data Fim"
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={handleBack}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? 'Salvando...'
                  : isEditing
                  ? 'Atualizar Evento'
                  : 'Criar Evento'}
              </Button>
            </div>
          </form>
        </main>
      </div>
    </PageWrapper>
  );
}
