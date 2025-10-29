"use client";

import { ReactNode } from "react";
import Button from "./Button";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
}

export function PageHeader({ title, description, action, secondaryAction }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="text-xs md:text-sm text-gray-600 mt-1">{description}</p>}
      </div>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-2">
          {secondaryAction}
          {action}
        </div>
      )}
    </div>
  );
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
}

export function SearchBar({ value, onChange, placeholder = "Search...", filters, actions }: SearchBarProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Search input section */}
      <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              data-testid="search-input"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent transition-all text-sm shadow-sm"
            />
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
      {/* Filters section */}
      {filters && (
        <div className="p-4 bg-gray-50/50">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Filters:</span>
            {filters}
          </div>
        </div>
      )}
    </div>
  );
}

