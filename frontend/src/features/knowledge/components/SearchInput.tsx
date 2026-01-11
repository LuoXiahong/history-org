import { Search, X, Loader2 } from 'lucide-react';
import { useRef, useEffect } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search persons, events...',
  isLoading = false,
  autoFocus = false,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        {isLoading ? (
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        ) : (
          <Search className="w-5 h-5 text-gray-400" />
        )}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-12 pr-12 py-4 
          bg-white border border-gray-200 rounded-xl
          text-gray-900 placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          shadow-sm hover:shadow transition-shadow
          text-lg
        "
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="
            absolute inset-y-0 right-0 pr-4 flex items-center
            text-gray-400 hover:text-gray-600 transition-colors
          "
          aria-label="Clear search"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
