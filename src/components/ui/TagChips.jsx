import React, { useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

const predefinedTags = [
  'Urgente',
  'Substituir Produto',
  'Testar Amostra',
  'Pedir Cotação',
  'Amostra Disponível',
  'Melhor Preço',
  'Exclusivo'
];

const TagChips = ({
  selectedTags = [],
  onTagsChange,
  readOnly = false,
}) => {
  const [customInput, setCustomInput] = useState('');
  const [availableTags] = useState(predefinedTags);

  const handleToggleTag = (tag) => {
    if (readOnly) return;
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    onTagsChange?.(newTags);
  };

  const handleAddCustom = () => {
    if (customInput.trim() && !selectedTags.includes(customInput)) {
      onTagsChange?.([...selectedTags, customInput]);
      setCustomInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    if (readOnly) return;
    onTagsChange?.(selectedTags.filter(t => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustom();
    }
  };

  return (
    <div className="w-full">
      {/* Selected Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {selectedTags.map((tag) => (
          <div
            key={tag}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50"
          >
            <span className="text-sm font-medium text-amber-100">{tag}</span>
            {!readOnly && (
              <button
                onClick={() => handleRemoveTag(tag)}
                className="hover:bg-amber-500/30 rounded p-0.5 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-amber-200" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Predefined Tags */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
          Etiquetas Disponíveis
        </p>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleToggleTag(tag)}
              disabled={readOnly}
              className={clsx(
                'px-3 py-1.5 rounded-full text-sm font-medium',
                'transition-all duration-200',
                'min-h-[44px] flex items-center justify-center',
                selectedTags.includes(tag)
                  ? 'bg-amber-500/20 border border-amber-500/50 text-amber-100'
                  : 'bg-surface-light border border-surface-light text-gray-300 hover:border-amber-500/50',
                readOnly && 'cursor-default'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Tag Input */}
      {!readOnly && (
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Adicionar etiqueta personalizada"
            className={clsx(
              'flex-1 px-3 py-2 rounded-lg',
              'bg-surface border border-surface-light',
              'text-white placeholder-gray-500 text-sm',
              'focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500',
              'transition-colors duration-200'
            )}
          />
          <button
            onClick={handleAddCustom}
            className={clsx(
              'px-4 py-2 rounded-lg',
              'bg-amber-500 hover:bg-amber-600',
              'text-gray-900 font-semibold text-sm',
              'transition-colors duration-200',
              'min-h-[44px]'
            )}
          >
            Adicionar
          </button>
        </div>
      )}
    </div>
  );
};

export default TagChips;
