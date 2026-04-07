import React, { useRef } from 'react';
import { Camera, X } from 'lucide-react';
import clsx from 'clsx';

const PhotoUploader = ({
  photos = [],
  onPhotosChange,
  maxPhotos = 10,
  readOnly = false,
}) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    if (readOnly) return;

    const files = Array.from(e.target.files || []);
    const newPhotos = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    const updated = [...photos, ...newPhotos].slice(0, maxPhotos);
    onPhotosChange?.(updated);
    e.target.value = '';
  };

  const handleRemovePhoto = (index) => {
    if (readOnly) return;
    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange?.(updated);
  };

  const getPhotoUrl = (photo) => {
    if (typeof photo === 'string') {
      return photo;
    }
    if (photo.preview) {
      return photo.preview;
    }
    if (photo.file && photo.file instanceof File) {
      return URL.createObjectURL(photo.file);
    }
    if (photo instanceof File) {
      return URL.createObjectURL(photo);
    }
    return null;
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="w-full">
      {/* Camera Button */}
      {canAddMore && !readOnly && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            'w-full mb-4 py-8 rounded-lg border-2 border-dashed',
            'border-surface-light hover:border-amber-500',
            'bg-surface/50 hover:bg-surface',
            'flex flex-col items-center justify-center gap-3',
            'transition-all duration-200 min-h-[44px]'
          )}
        >
          <Camera className="w-8 h-8 text-amber-500" />
          <div className="text-center">
            <p className="text-sm font-semibold text-white">
              Adicionar Fotos
            </p>
            <p className="text-xs text-gray-400">
              {photos.length}/{maxPhotos} fotos
            </p>
          </div>
        </button>
      )}

      {/* Hidden File Input */}
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

      {/* Photo Thumbnails */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo, index) => {
            const url = getPhotoUrl(photo);
            return (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-surface-light"
                />
                {!readOnly && (
                  <button
                    onClick={() => handleRemovePhoto(index)}
                    className={clsx(
                      'absolute top-1 right-1',
                      'bg-red-600 hover:bg-red-700 rounded-full p-1',
                      'opacity-0 group-hover:opacity-100',
                      'transition-opacity duration-200',
                      'min-h-[44px] min-w-[44px] flex items-center justify-center'
                    )}
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {photos.length === 0 && !canAddMore && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400">
            Limite máximo de {maxPhotos} fotos atingido
          </p>
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
