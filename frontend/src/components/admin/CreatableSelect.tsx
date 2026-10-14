"use client";

import React, { useState, useRef, useEffect, useMemo, useId } from "react";
import { Search, ChevronDown, X, Plus, Check } from "lucide-react";

export interface CreatableSelectProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  options: string[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  allowNone?: boolean;
  noneLabel?: string;
  maxLength?: number;
  className?: string;
  disabled?: boolean;
  onCustomCreate?: (newValue: string) => void;
  error?: string;
  helperText?: string;
  id?: string;
}

export function CreatableSelect({
  value,
  onChange,
  options,
  placeholder = "Select or type custom...",
  label,
  required = false,
  allowNone = true,
  noneLabel = "None (Not applicable)",
  maxLength = 80,
  className = "",
  disabled = false,
  onCustomCreate,
  error,
  helperText,
  id,
}: CreatableSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  // Focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Clean and deduplicate available options
  const normalizedOptions = useMemo(() => {
    const map = new Map<string, string>();
    options.forEach((opt) => {
      const trimmed = opt.trim();
      if (trimmed && !map.has(trimmed.toLowerCase())) {
        map.set(trimmed.toLowerCase(), trimmed);
      }
    });
    // If current value exists and isn't in options, ensure it's displayed
    if (value && value.trim() && !map.has(value.trim().toLowerCase())) {
      map.set(value.trim().toLowerCase(), value.trim());
    }
    return Array.from(map.values());
  }, [options, value]);

  // Filtered list matching search query
  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter((opt) => opt.toLowerCase().includes(q));
  }, [normalizedOptions, searchQuery]);

  // Check if search query is a new custom value
  const cleanedQuery = searchQuery.trim();
  const isExactMatch = useMemo(() => {
    if (!cleanedQuery) return false;
    return normalizedOptions.some(
      (opt) => opt.toLowerCase() === cleanedQuery.toLowerCase()
    );
  }, [normalizedOptions, cleanedQuery]);

  const canCreate = Boolean(cleanedQuery && !isExactMatch && cleanedQuery.length <= maxLength);

  // Compute selectable item list for keyboard navigation
  // Index 0: None item (if allowNone && !required)
  // Indices 1 .. N: filteredOptions
  // Index N + 1: Create custom item (if canCreate)
  const selectableItems = useMemo(() => {
    const items: Array<{ type: "none" | "option" | "create"; value: string | null }> = [];
    if (allowNone && !required) {
      items.push({ type: "none", value: null });
    }
    filteredOptions.forEach((opt) => {
      items.push({ type: "option", value: opt });
    });
    if (canCreate) {
      items.push({ type: "create", value: cleanedQuery });
    }
    return items;
  }, [allowNone, required, filteredOptions, canCreate, cleanedQuery]);

  const handleSelect = (itemValue: string | null, isNew: boolean = false) => {
    onChange(itemValue);
    if (isNew && itemValue && onCustomCreate) {
      onCustomCreate(itemValue);
    }
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        handleSelect(item.value, item.type === "create");
      } else if (canCreate) {
        handleSelect(cleanedQuery, true);
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

  const isCurrentValueCustom = Boolean(
    value && !options.some((opt) => opt.toLowerCase() === value.trim().toLowerCase())
  );

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
        <div className="flex-1 flex items-center gap-1.5 overflow-hidden">
          {value ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-medium text-[#202124] truncate">{value}</span>
              {isCurrentValueCustom && (
                <span className="px-1.5 py-0.2 rounded-md bg-[#DFBA73]/20 text-[#8B6E30] text-[10px] font-semibold shrink-0">
                  Custom
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
              title="Clear value"
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
              <Search className="w-3.5 h-3.5 text-[#9AA0A6] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search or enter custom..."
                maxLength={maxLength}
                className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-[#D3D8DF] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]"
              />
            </div>
            {cleanedQuery.length > maxLength && (
              <p className="text-[10px] text-rose-500 mt-1 pl-1">
                Limit is {maxLength} characters.
              </p>
            )}
          </div>

          {/* Items List */}
          <div ref={listRef} className="overflow-y-auto p-1.5 space-y-0.5 flex-1">
            {selectableItems.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#70757A]">
                No options found. Type above to add a custom value.
              </div>
            ) : (
              selectableItems.map((item, index) => {
                const isHighlighted = highlightedIndex === index;

                if (item.type === "none") {
                  const isSelected = value === null || value === undefined || value === "";
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

                if (item.type === "create") {
                  return (
                    <div
                      key={`__create__${item.value}`}
                      role="option"
                      aria-selected={false}
                      onClick={() => handleSelect(item.value, true)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`px-3 py-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer border border-dashed transition-colors ${
                        isHighlighted
                          ? "bg-[#DFBA73]/20 border-[#DFBA73] text-[#1B1E22] font-semibold"
                          : "bg-amber-50/40 border-amber-200 text-[#8B6E30] hover:bg-[#DFBA73]/15"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Plus className="w-3.5 h-3.5 text-[#8B6E30] shrink-0" />
                        <span className="truncate">
                          Add <strong>&quot;{item.value}&quot;</strong>
                        </span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white border border-[#DFBA73]/50 text-[#8B6E30] shrink-0">
                        New
                      </span>
                    </div>
                  );
                }

                const isSelected = value === item.value;
                return (
                  <div
                    key={item.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(item.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isHighlighted
                        ? "bg-neutral-100 text-[#202124]"
                        : isSelected
                        ? "bg-[#DFBA73]/15 text-[#8B6E30] font-semibold"
                        : "text-[#202124] hover:bg-neutral-50"
                    }`}
                  >
                    <span className="truncate">{item.value}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#8B6E30]" />}
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
