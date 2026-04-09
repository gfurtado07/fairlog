import React, { useRef } from 'react';
import { Camera, X, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

/**
 * PhotoUploader — suporta fotos com anotações de texto.
 *
 * Formato de cada foto no array `photos`:
 *   { preview: string, file?: File, url?: string, annotation: string }
 *
 * Fotos antigas como strings puras também são aceitas (sem anotação).
 */
const PhotoUploader = ({
  photos = [],
  onPhotosChange,
  maxPhotos = 10,
  readOnly = false,
}) => {
  const fileInputRef = useRef(null);

  // Normalise a photo entry to always be an object with at least { preview/url, annotation }
  const normalise = (photo) => {
    if (typeof photo === 'string') return { url: photo, annotation: '' };
    return { annotation: '', ...photo };
  };

  const normalisedPhotos = photos.map(normalise);

  const handleFileSelect = (e) => {
    if (readOnly) return;
    const files = Array.from(e.target.files || []);
    const newEntries = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      annotation: '',
    }));
    const updated = [...normalisedPhotos, ...newEntries].slice(0, maxPhotos);
    onPhotosChange?.(updated);
    e.target.value = '';
  };

  const handleRemovePhoto = (index) => {
    if (readOnly) return;
    const updated = normalisedPhotos.filter((_, i) => i !== index);
    onPhotosChange?.(updated);
  };

  const handleAnnotationChange = (index, value) => {
    const updated = normalisedPhotos.map((p, i) =>
      i === index ? { ...p, annotation: value } : p
    );
    onPhotosChange?.(updated);
  };

  const getPhotoUrl = (photo) => {
    if (photo.preview) return photo.preview;
    if (photo.url) return photo.url;
    if (photo.file instanceof File) return URL.createObjectURL(photo.file);
    return null;
  };

  const canAddMore = normalisedPhotos.length < maxPhotos;

  return (
    <div className="w-full space-y-3">
      {/* Add photos button */}
      {canAddMore && !readOnly && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            'w-full py-6 rounded-lg border-2 border-dashed',
            'border-gray-600 hover:border-amber-500',
            'bg-gray-800/50 hover:bg-gray-800',
            'flex flex-col items-center justify-center gap-2',
            'transition-all duration-200'
          )}
        >
          <Camera className="w-7 h-7 text-amber-500" />
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Adicionar Fotos</p>
            <p className="text-xs text-gray-400">
              {normalisedPhotos.length}/{maxPhotos} • Toque para abrir a câmera
            </p>
          </div>
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={!canAddMore || readOnly}
      />

      {/* Photo thumbnails with annotations */}
      {normalisedPhotos.length > 0 && (
        <div className="space-y-3">
          {normalisedPhotos.map((photo, index) => {
            const url = getPhotoUrl(photo);
            return (
              <div
                key={index}
                className="rounded-lg border border-gray-700 overflow-hidden bg-gray-800"
              >
                {/* Thumbnail row */}
                <div className="flex items-start gap-3 p-2">
                  <div className="relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden bg-gray-700">
                    {url && (
                      <img
                        src={url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-0.5 right-0.5 bg-red-600 hover:bg-red-700 rounded-full p-0.5 transition-colors"
                        aria-label="Remover foto"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>

                  {/* Annotation input */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      <MessageSquare className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-gray-400 font-medium">
                        Anotação
                      </span>
                    </div>
                    {readOnly ? (
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">
                        {photo.annotation || (
                          <span className="italic text-gray-500">Sem anotação</span>
                        )}
                      </p>
                    ) : (
                      <textarea
                        value={photo.annotation || ''}
                        onChange={(e) =>
                          handleAnnotationChange(index, e.target.value)
                        }
                        placeholder="Ex: Preço $2.50/un • MOQ 500 • entrega 30 dias"
                        rows={2}
                        className={clsx(
                          'w-full px-2 py-1.5 rounded text-sm',
                          'bg-gray-700 border border-gray-600 text-white',
                          'placeholder-gray-500 resize-none',
                          'focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500',
                          'transition-colors'
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!canAddMore && !readOnly && (
        <p className="text-center text-xs text-gray-500">
          Limite de {maxPhotos} fotos atingido
        </p>
      )}
    </div>
  );
};

export default PhotoUploader;
