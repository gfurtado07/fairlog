import React, { useRef, useState } from 'react';
import { CreditCard, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import clsx from 'clsx';

/**
 * BusinessCardScanner
 * Opens the camera to photograph a business card, sends it to
 * the scan-business-card Edge Function, and returns extracted fields.
 *
 * Props:
 *   onExtracted(data) — called with { name, company, phone, email, website, wechat, address, title, notes }
 */
const BusinessCardScanner = ({ onExtracted }) => {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | scanning | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const compressImage = (file, maxWidthPx = 1200) => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxWidthPx / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
      };
      img.src = url;
    });
  };

  const toBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // reader.result is "data:image/jpeg;base64,XXXX" — strip the prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setStatus('scanning');
    setErrorMsg('');

    try {
      // Compress before sending to keep payload small
      const compressed = await compressImage(file);
      const imageBase64 = await toBase64(compressed);

      const { data, error } = await supabase.functions.invoke('scan-business-card', {
        body: { imageBase64, mediaType: 'image/jpeg' },
      });

      if (error) throw new Error(error.message || 'Erro ao chamar função');
      if (data?.error) throw new Error(data.error);

      setStatus('success');
      onExtracted?.(data?.data || {});

      // Reset back to idle after 2 s
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error('BusinessCardScanner error:', err);
      setErrorMsg(err.message || 'Erro ao ler cartão');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const stateConfig = {
    idle: {
      bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 hover:border-amber-500',
      icon: <CreditCard className="w-5 h-5 text-amber-400" />,
      text: 'Escanear Cartão de Visita',
      sub: 'Fotografe o cartão e o app preenche os dados automaticamente',
    },
    scanning: {
      bg: 'bg-blue-500/10 border-blue-500/40 cursor-wait',
      icon: <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />,
      text: 'Lendo cartão com IA...',
      sub: 'Aguarde alguns segundos',
    },
    success: {
      bg: 'bg-green-500/10 border-green-500/40',
      icon: <CheckCircle className="w-5 h-5 text-green-400" />,
      text: 'Dados preenchidos!',
      sub: 'Revise e ajuste as informações abaixo',
    },
    error: {
      bg: 'bg-red-500/10 border-red-500/40',
      icon: <AlertCircle className="w-5 h-5 text-red-400" />,
      text: 'Não foi possível ler o cartão',
      sub: errorMsg || 'Tente novamente com uma foto mais clara',
    },
  };

  const cfg = stateConfig[status];

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />

      <button
        type="button"
        disabled={status === 'scanning'}
        onClick={() => status === 'idle' && fileInputRef.current?.click()}
        className={clsx(
          'w-full flex items-center gap-3 px-4 py-3 rounded-lg border',
          'transition-all duration-200',
          cfg.bg,
          status !== 'scanning' && status === 'idle' && 'cursor-pointer'
        )}
      >
        <div className="flex-shrink-0">{cfg.icon}</div>
        <div className="text-left min-w-0">
          <p className="text-sm font-semibold text-white">{cfg.text}</p>
          <p className="text-xs text-gray-400 truncate">{cfg.sub}</p>
        </div>
      </button>
    </div>
  );
};

export default BusinessCardScanner;
