import React, { useState, useRef, useEffect } from "react";

interface AutocompleteInputProps<T> {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: T) => void;
  suggestions: T[];
  renderSuggestion: (item: T) => React.ReactNode;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function AutocompleteInput<T>({
  id,
  value,
  onChange,
  onSelect,
  suggestions,
  renderSuggestion,
  placeholder,
  className = "",
  disabled = false,
  required = false,
}: AutocompleteInputProps<T>) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        id={id}
        type="text"
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        className={className}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-[200] divide-y divide-white/5 scrollbar-thin">
          {suggestions.map((item, idx) => (
            <div
              key={idx}
              onMouseDown={() => {
                onSelect(item);
                setShowSuggestions(false);
              }}
              className="cursor-pointer"
            >
              {renderSuggestion(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
