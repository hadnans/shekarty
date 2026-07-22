'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { type Lang, type Product, type Category, type SearchResult } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useLangStore } from '@/stores/lang-store';
import { api } from '@/services/api';

interface SearchBarProps {
  onResults?: (results: SearchResult | null) => void;
  onQueryChange?: (query: string) => void;
  lang?: Lang;
  expanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}

export default function SearchBar({
  onResults,
  onQueryChange,
  lang: langProp,
  expanded: expandedProp,
  onExpandChange,
}: SearchBarProps) {
  const { lang: storeLang, isRTL } = useLangStore();
  const lang = langProp ?? storeLang;

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = expandedProp ?? internalExpanded;
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        onResults?.(null);
        return;
      }

      setIsSearching(true);
      try {
        const result = await api.search(searchQuery, lang);
        if (result.success) {
          onResults?.(result.data);
        }
      } catch {
        // Silent fail on search
      } finally {
        setIsSearching(false);
      }
    },
    [lang, onResults]
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      onQueryChange?.(value);

      // Debounced search
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        handleSearch(value);
      }, 300);
    },
    [handleSearch, onQueryChange]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    onResults?.(null);
    onQueryChange?.('');
    inputRef.current?.focus();
  }, [onResults, onQueryChange]);

  const handleExpand = useCallback(() => {
    setInternalExpanded(true);
    onExpandChange?.(true);
  }, [onExpandChange]);

  const handleCollapse = useCallback(() => {
    setInternalExpanded(false);
    onExpandChange?.(false);
    setQuery('');
    onResults?.(null);
  }, [onResults, onExpandChange]);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search
          className="absolute top-1/2 -translate-y-1/2 size-5"
          style={{
            color: isSearching ? 'var(--ggh-primary)' : '#9E9E9E',
            [isRTL ? 'right' : 'left']: '14px',
          }}
        />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder={t(lang, 'search')}
          className="h-12 text-base rounded-xl"
          style={{
            [isRTL ? 'paddingRight' : 'paddingLeft']: '44px',
            [isRTL ? 'paddingLeft' : 'paddingRight']: query ? '44px' : '16px',
            backgroundColor: '#F5F5F5',
            border: expanded ? '2px solid var(--ggh-primary)' : '1px solid transparent',
          }}
          onFocus={handleExpand}
          aria-label={t(lang, 'search')}
        />

        {/* Clear / Loading indicator */}
        {query && (
          <div
            className="absolute top-1/2 -translate-y-1/2"
            style={{ [isRTL ? 'left' : 'right']: '8px' }}
          >
            {isSearching ? (
              <Loader2 className="size-5 animate-spin" style={{ color: 'var(--ggh-primary)' }} />
            ) : (
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={handleClear}
                aria-label={t(lang, 'clear')}
              >
                <X className="size-4" style={{ color: 'var(--ggh-text-secondary)' }} />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
