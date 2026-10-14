"use client";

import React, { useState, useRef, useEffect, useMemo, useId, useCallback } from "react";
import { Search, ChevronDown, X, Check, Loader2 } from "lucide-react";

export interface SearchableSelectOption {
  id: string;
  label: string;
  subLabel?: string;
  badge?: string;
}

export interface SearchableSelectProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  options?: SearchableSelectOption[];
  loadOptions?: (query: string, signal?: AbortSignal) => Promise<SearchableSelectOption[]>;
  resolveOption?: (id: string) => Promise<SearchableSelectOption | null>;
  initialOption?: SearchableSelectOption | null;
  placeholder?: string;
  label?: string;
  required?: boolean;
  allowNone?: boolean;
  noneLabel?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  id?: string;
  debounceMs?: number;
  minSearchLength?: number;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  loadOptions,
  resolveOption,
  initialOption,
  placeholder = "Select...",
  label,
  required = false,
  allowNone = true,
  noneLabel = "None (Unset)",
  className = "",
  disabled = false,
  error,
  helperText,
  id,
  debounceMs = 250,
  minSearchLength = 0,
}: SearchableSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [asyncOptions, setAsyncOptions] = useState<SearchableSelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedCurrentOption, setResolvedCurrentOption] = useState<SearchableSelectOption | null>(
    initialOption || null
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);
  const queryCacheRef = useRef<Map<string, SearchableSelectOption[]>>(new Map());

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync initialOption if provided externally
  useEffect(() => {
    if (initialOption && initialOption.id === value) {
      setResolvedCurrentOption(initialOption);
    }
  }, [initialOption, value]);

  // Resolve current selection if option not present in static list or async list
  useEffect(() => {
    if (!value) {
      setResolvedCurrentOption(null);
      return;
    }

    if (options) {
      const match = options.find((opt) => opt.id === value);
      if (match) {
        setResolvedCurrentOption(match);
        return;
      }
    }

    const matchAsync = asyncOptions.find((opt) => opt.id === value);
    if (matchAsync) {
      setResolvedCurrentOption(matchAsync);
      return;
    }

    if (resolveOption && (!resolvedCurrentOption || resolvedCurrentOption.id !== value)) {
      let isSubscribed = true;
      resolveOption(value)
        .then((resolved) => {
          if (isSubscribed && resolved) {
            setResolvedCurrentOption(resolved);
          }
        })
        .catch(() => {
          // Keep current fallback
        });
      return () => {
        isSubscribed = false;
      };
    }
  }, [value, options, asyncOptions, resolveOption, resolvedCurrentOption]);

  // Execute async search
  const performSearch = useCallback(
    async (query: string) => {
      if (!loadOptions) return;

      const trimmed = query.trim();
      if (trimmed.length < minSearchLength) {
        setAsyncOptions([]);
        setIsLoading(false);
        return;
      }

      // Check client cache
      const cacheKey = trimmed.toLowerCase();
      if (queryCacheRef.current.has(cacheKey)) {
        setAsyncOptions(queryCacheRef.current.get(cacheKey)!);
        setIsLoading(false);
        setLoadError(null);
        return;
      }

      // Abort previous in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const currentRequestId = ++requestIdRef.current;

      setIsLoading(true);
      setLoadError(null);

      try {
        const results = await loadOptions(trimmed, controller.signal);
        if (requestIdRef.current === currentRequestId) {
          queryCacheRef.current.set(cacheKey, results);
          setAsyncOptions(results);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (requestIdRef.current === currentRequestId) {
          setLoadError("Failed to load records. Please try again.");
          setIsLoading(false);
        }
      }
    },
    [loadOptions, minSearchLength]
  );

  // Debounced search trigger when typing
  useEffect(() => {
    if (!isOpen || !loadOptions) return;

    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, loadOptions, debounceMs, performSearch]);

  // Initial load when opening if loadOptions provided
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setHighlightedIndex(0);
      setLoadError(null);
      if (loadOptions) {
        performSearch("");
      }
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      // Abort any ongoing request when closing
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsLoading(false);
    }
  }, [isOpen, loadOptions, performSearch]);

  // Filter static options or use async options
  const displayOptions = useMemo(() => {
    if (loadOptions) {
      return asyncOptions;
    }
    const opts = options || [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return opts;
    return opts.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(q) : false;
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
      return matchLabel || matchSub || matchBadge;
    });
  }, [loadOptions, asyncOptions, options, searchQuery]);

  // Selectable items: index 0 is None if allowNone && !required, followed by displayOptions
  const selectableItems = useMemo(() => {
    const items: Array<{ isNone: boolean; option: SearchableSelectOption | null }> = [];
    if (allowNone && !required) {
      items.push({ isNone: true, option: null });
    }
    displayOptions.forEach((opt) => {
      items.push({ isNone: false, option: opt });
    });
    return items;
  }, [allowNone, required, displayOptions]);

  const handleSelect = (selectedOpt: SearchableSelectOption | null) => {
    if (!selectedOpt) {
      setResolvedCurrentOption(null);
      onChange(null);
    } else {
      setResolvedCurrentOption(selectedOpt);
      onChange(selectedOpt.id);
    }
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResolvedCurrentOption(null);
    onChange(null);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < selectableItems.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : selectableItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < selectableItems.length) {
        const item = selectableItems[highlightedIndex];
        handleSelect(item.isNone ? null : item.option);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0) {
      const element = listRef.current.children[highlightedIndex] as HTMLElement;
      if (element) {
        element.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const selectedDisplay = resolvedCurrentOption;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-bold text-[#202124] mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Box */}
      <div
        id={selectId}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={`${selectId}-listbox`}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full min-h-[38px] px-3 py-2 bg-[#F7F7F5] border rounded-xl text-xs flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
          disabled ? "opacity-60 cursor-not-allowed" : "hover:border-[#C5A880]"
        } ${
          isOpen
            ? "border-[#C5A880] ring-2 ring-[#C5A880]/20 bg-white"
            : error
            ? "border-rose-400 bg-rose-50/30"
            : "border-[#D3D8DF]"
        }`}
      >
        <div className="flex-1 flex items-center gap-2 overflow-hidden">
          {selectedDisplay ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-[#202124] truncate">
                {selectedDisplay.label}
              </span>
              {selectedDisplay.subLabel && (
                <span className="text-[11px] text-[#70757A] truncate">
                  ({selectedDisplay.subLabel})
                </span>
              )}
              {selectedDisplay.badge && (
                <span className="px-1.5 py-0.5 rounded-md bg-neutral-200/80 text-[#5F6368] text-[10px] font-semibold shrink-0">
                  {selectedDisplay.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[#9AA0A6] truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && (allowNone || !required) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-[#70757A] hover:text-[#202124] hover:bg-neutral-200/60 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-[#70757A] transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#C5A880]" : ""
            }`}
          />
        </div>
      </div>

      {/* Floating Dropdown */}
      {isOpen && (
        <div
          id={`${selectId}-listbox`}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-72"
        >
          {/* Search Header */}
          <div className="p-2 border-b border-[#F0F2F5] bg-neutral-50/50">
            <div className="relative">
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 text-[#C5A880] animate-spin absolute left-2.5 top-1/2 -translate-y-1/2" />
              ) : (
                <Search className="w-3.5 h-3.5 text-[#9AA0A6] absolute left-2.5 top-1/2 -translate-y-1/2" />
              )}
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={loadOptions ? "Type to search records..." : "Search..."}
                className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-[#D3D8DF] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]"
              />
            </div>
          </div>

          {/* Items List */}
          <div ref={listRef} className="overflow-y-auto p-1.5 space-y-0.5 flex-1">
            {loadError ? (
              <div className="py-4 text-center text-xs text-rose-500 font-medium px-2">
                {loadError}
              </div>
            ) : isLoading && selectableItems.length === 0 ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-[#70757A]">
                <Loader2 className="w-4 h-4 text-[#C5A880] animate-spin" />
                <span>Searching catalog records...</span>
              </div>
            ) : selectableItems.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#70757A]">
                No matching records found.
              </div>
            ) : (
              selectableItems.map((item, index) => {
                const isHighlighted = highlightedIndex === index;

                if (item.isNone) {
                  const isSelected = !value;
                  return (
                    <div
                      key="__none__"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(null)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isHighlighted
                          ? "bg-neutral-100 text-[#202124]"
                          : isSelected
                          ? "bg-amber-50/50 text-[#8B6E30] font-medium"
                          : "text-[#5F6368] hover:bg-neutral-50"
                      }`}
                    >
                      <span className="italic">{noneLabel}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#8B6E30]" />}
                    </div>
                  );
                }

                const opt = item.option!;
                const isSelected = value === opt.id;
                return (
                  <div
                    key={opt.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isHighlighted
                        ? "bg-neutral-100 text-[#202124]"
                        : isSelected
                        ? "bg-[#DFBA73]/15 text-[#8B6E30] font-semibold"
                        : "text-[#202124] hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate font-medium">{opt.label}</span>
                      {opt.subLabel && (
                        <span className="text-[11px] text-[#70757A] truncate">
                          ({opt.subLabel})
                        </span>
                      )}
                      {opt.badge && (
                        <span className="px-1.5 py-0.5 rounded-md bg-neutral-200/80 text-[#5F6368] text-[10px] font-semibold shrink-0">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#8B6E30] shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-rose-500 mt-1 font-medium">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-[#70757A] mt-1">{helperText}</p>
      )}
    </div>
  );
}
