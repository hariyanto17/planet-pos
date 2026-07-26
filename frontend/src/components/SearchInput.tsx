import React from "react";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearchChange: (value: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ onSearchChange, className = "", ...props }) => {
  return (
    <div className="relative w-full max-w-sm">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        onChange={(e) => onSearchChange(e.target.value)}
        className={`w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-lg text-zinc-100 placeholder-zinc-500 outline-none focus:ring-4 transition duration-200 ${className}`}
        {...props}
      />
    </div>
  );
};
