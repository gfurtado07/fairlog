import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import { MapPin } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (!formData.fullName.trim()) {
          toast.error('Por favor, preencha o nome completo');
          setLoading(false);
          return;
        }
        await signUp(formData.email, formData.password, formData.fullName);
        toast.success('Conta criada com sucesso!');
      } else {
        await signIn(formData.email, formData.password);
        toast.success('Bem-vindo!');
      }
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <MapPin className="w-10 h-10 text-[#f59e0b]" />
            <h1 className="text-4xl font-bold text-[#f59e0b]">FairLog</h1>
          </div>
          <p className="text-gray-400 text-sm">Catálogo de feiras internacionais</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-0 mb-6 bg-[#1a1d27] rounded-lg p-1">
          <button
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-2 px-4 rounded font-medium transition-colors ${
              !isSignUp
                ? 'bg-[#f59e0b] text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-2 px-4 rounded font-medium transition-colors ${
              isSignUp
                ? 'bg-[#f59e0b] text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Cadastrar
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <Input
              label="Nome completo"
              type="text"
              name="fullName"
              placeholder="Seu nome completo"
              value={formData.fullName}
              onChange={handleInputChange}
              required
            />
          )}

          <Input
            label="E-mail"
            type="email"
            name="email"
            placeholder="seu@email.com"
            value={formData.email}
            onChange={handleInputChange}
            autoComplete="email"
            required
          />

          <Input
            label="Senha"
            type="password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleInputChange}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
          />

          <Button
            type="submit"
            fullWidth
            disabled={loading}
            className="mt-6"
          >
            {loading ? 'Carregando...' : isSignUp ? 'Criar Conta' : 'Entrar'}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-6">
          © 2026 FairLog. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
