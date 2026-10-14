"use client";

import React, { useState, useRef, useEffect, useMemo, useId, useCallback } from "react";
import { Search, ChevronDown, X, Check, Loader2 } from "lucide-react";
import { type SearchableSelectOption } from "./SearchableSelect";

export interface SearchableMultiSelectProps {
  value: string[]; // Array of selected IDs
  onChange: (value: string[]) => void;
  options?: SearchableSelectOption[];
  loadOptions?: (query: string, signal?: AbortSignal) => Promise<SearchableSelectOption[]>;
  resolveOptions?: (ids: string[]) => Promise<SearchableSelectOption[]>;
  initialOptions?: SearchableSelectOption[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  id?: string;
  debounceMs?: number;
  minSearchLength?: number;
}

export function SearchableMultiSelect({
  value = [],
  onChange,
  options,
  loadOptions,
  resolveOptions,
  initialOptions,
  placeholder = "Select multiple...",
  label,
  required = false,
  className = "",
  disabled = false,
  error,
  helperText,
  id,
  debounceMs = 250,
  minSearchLength = 0,
}: SearchableMultiSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [asyncOptions, setAsyncOptions] = useState<SearchableSelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Registry of known options to render chip labels cleanly
  const [knownOptionsMap, setKnownOptionsMap] = useState<Map<string, SearchableSelectOption>>(() => {
    const map = new Map<string, SearchableSelectOption>();
    if (initialOptions) {
      initialOptions.forEach((opt) => map.set(opt.id, opt));
    }
    if (options) {
      options.forEach((opt) => map.set(opt.id, opt));
    }
    return map;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  // Update known options from props
  useEffect(() => {
    setKnownOptionsMap((prev) => {
      const updated = new Map(prev);
      if (initialOptions) {
        initialOptions.forEach((opt) => updated.set(opt.id, opt));
      }
      if (options) {
        options.forEach((opt) => updated.set(opt.id, opt));
      }
      return updated;
    });
  }, [options, initialOptions]);

  // Resolve any selected IDs that aren't yet in known options
  useEffect(() => {
    if (!resolveOptions || value.length === 0) return;

    const missingIds = value.filter((id) => !knownOptionsMap.has(id));
    if (missingIds.length === 0) return;

    let isSubscribed = true;
    resolveOptions(missingIds)
      .then((resolved) => {
        if (isSubscribed && resolved && resolved.length > 0) {
          setKnownOptionsMap((prev) => {
            const next = new Map(prev);
            resolved.forEach((opt) => next.set(opt.id, opt));
            return next;
          });
        }
      })
      .catch(() => {
        // Silently preserve IDs
      });

    return () => {
      isSubscribed = false;
    };
  }, [value, resolveOptions, knownOptionsMap]);

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

      const cacheKey = trimmed.toLowerCase();
      if (queryCacheRef.current.has(cacheKey)) {
        const cached = queryCacheRef.current.get(cacheKey)!;
        setAsyncOptions(cached);
        setKnownOptionsMap((prev) => {
          const next = new Map(prev);
          cached.forEach((opt) => next.set(opt.id, opt));
          return next;
        });
        setIsLoading(false);
        setLoadError(null);
        return;
      }

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
          setKnownOptionsMap((prev) => {
            const next = new Map(prev);
            results.forEach((opt) => next.set(opt.id, opt));
            return next;
          });
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
      setLoadError(null);
      if (loadOptions) {
        performSearch("");
      }
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsLoading(false);
    }
  }, [isOpen, loadOptions, performSearch]);

  // Displayed options in dropdown
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

  const toggleOption = (option: SearchableSelectOption) => {
    const isSelected = value.includes(option.id);
    let nextValue: string[];
    if (isSelected) {
      nextValue = value.filter((id) => id !== option.id);
    } else {
      // Prevent duplicates
      nextValue = [...new Set([...value, option.id])];
      setKnownOptionsMap((prev) => new Map(prev).set(option.id, option));
    }
    onChange(nextValue);
  };

  const removeChip = (idToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((id) => id !== idToRemove));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="flex items-center justify-between mb-1">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-bold text-[#202124]">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}
        {value.length > 0 && !disabled && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] text-[#8B6E30] hover:text-[#5B4312] font-semibold transition-colors"
          >
            Clear all ({value.length})
          </button>
        )}
      </div>

      {/* Selected Chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((id) => {
            const opt = knownOptionsMap.get(id);
            const labelText = opt ? opt.label : `ID: ${id.slice(0, 8)}...`;
            const subText = opt?.subLabel;

            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#DFBA73]/40 rounded-xl text-xs text-[#202124] shadow-sm animate-in fade-in"
              >
                <span className="font-medium truncate max-w-[180px]">{labelText}</span>
                {subText && (
                  <span className="text-[10px] text-[#70757A] truncate max-w-[100px]">
                    ({subText})
                  </span>
                )}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => removeChip(id, e)}
                    className="p-0.5 rounded-full hover:bg-neutral-100 text-[#70757A] hover:text-rose-600 transition-colors"
                    title={`Remove ${labelText}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Trigger Box */}
      <div
        id={selectId}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={`${selectId}-multibox`}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
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
          {value.length > 0 ? (
            <span className="font-semibold text-[#8B6E30] text-xs">
              {value.length} record{value.length > 1 ? "s" : ""} selected — click to add or modify
            </span>
          ) : (
            <span className="text-[#9AA0A6] truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {value.length > 0 && !disabled && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#DFBA73]/20 text-[#8B6E30] text-[10px] font-bold">
              {value.length}
            </span>
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
          id={`${selectId}-multibox`}
          role="listbox"
          aria-multiselectable="true"
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
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={loadOptions ? "Type to search records..." : "Search..."}
                className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-[#D3D8DF] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto p-1.5 space-y-0.5 flex-1">
            {loadError ? (
              <div className="py-4 text-center text-xs text-rose-500 font-medium px-2">
                {loadError}
              </div>
            ) : isLoading && displayOptions.length === 0 ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-[#70757A]">
                <Loader2 className="w-4 h-4 text-[#C5A880] animate-spin" />
                <span>Searching catalog records...</span>
              </div>
            ) : displayOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#70757A]">
                No matching records found.
              </div>
            ) : (
              displayOptions.map((opt) => {
                const isSelected = value.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleOption(opt)}
                    className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#DFBA73]/15 text-[#8B6E30] font-semibold"
                        : "text-[#202124] hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                          isSelected
                            ? "bg-[#C5A880] border-[#C5A880] text-white"
                            : "border-[#D3D8DF] bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate">{opt.label}</span>
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
                    </div>
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
