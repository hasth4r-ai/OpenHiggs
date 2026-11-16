'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from './icons.jsx';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  disabled = false,
  className = '',
  menuClassName = '',
  size = 'md',
  align = 'left'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options to [{ value, label, icon }]
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: String(opt), label: String(opt) };
    }
    if (Array.isArray(opt)) {
      return { value: String(opt[0]), label: String(opt[1]), icon: opt[2] };
    }
    return { value: String(opt.value), label: String(opt.label ?? opt.value), icon: opt.icon };
  });

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value)) || {
    value: value ?? '',
    label: value ? String(value) : placeholder
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optValue) => {
    if (disabled) return;
    setIsOpen(false);
    if (onChange) {
      onChange({ target: { value: optValue } });
    }
  };

  const sizeClasses = size === 'sm'
    ? 'text-xs py-1.5 px-2.5 rounded-lg gap-1.5'
    : 'text-xs py-2 px-3 rounded-xl gap-2';

  return (
    <div ref={containerRef} className="relative inline-block w-full select-none">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between bg-[#18181f] border border-white/5 text-white/90 font-medium hover:border-white/10 hover:text-white transition-all outline-none focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed ${sizeClasses} ${className}`}
      >
        <span className="truncate flex items-center gap-1.5">
          {selectedOption.icon && (
            typeof selectedOption.icon === 'string' ? (
              <img src={selectedOption.icon} alt="" className="w-4 h-4 object-contain rounded flex-shrink-0" />
            ) : (
              selectedOption.icon
            )
          )}
          <span className="truncate">{selectedOption.label}</span>
        </span>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 flex-shrink-0 ml-1.5 ${
            isOpen ? 'rotate-180 text-[var(--color-accent-text)]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`absolute z-50 mt-1 max-h-60 w-full min-w-[140px] overflow-auto rounded-xl bg-[#14141a] border border-white/10 p-1 shadow-2xl backdrop-blur-xl custom-scrollbar animate-fade-in ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${menuClassName}`}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                  isSelected
                    ? 'bg-[var(--color-accent)] text-white font-semibold'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="truncate flex items-center gap-2">
                  {opt.icon && (
                    typeof opt.icon === 'string' ? (
                      <img src={opt.icon} alt="" className="w-4 h-4 object-contain rounded flex-shrink-0" />
                    ) : (
                      opt.icon
                    )
                  )}
                  <span className="truncate">{opt.label}</span>
                </span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white ml-2 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
