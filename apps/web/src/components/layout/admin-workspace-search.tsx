"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { NavigationItem } from "./navigation";

export function AdminWorkspaceSearch({ items }: Readonly<{ items: readonly NavigationItem[] }>) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const results = query.trim()
    ? items.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <div className="relative hidden w-full max-w-[420px] md:block">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#888]"
        size={14}
      />
      <label className="sr-only" htmlFor="admin-workspace-search">
        Search admin workspaces
      </label>
      <input
        autoComplete="off"
        className="h-8 w-full rounded-md border border-[#d6d6d6] bg-[#f8f8f8] pl-9 pr-14 text-xs text-[#222] outline-none transition focus:border-[#8d8d8d] focus:bg-white focus:ring-2 focus:ring-emerald-500/10"
        id="admin-workspace-search"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search workspaces"
        ref={inputRef}
        type="search"
        value={query}
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[#d6d6d6] bg-white px-1.5 py-0.5 text-[9px] text-[#777]">
        Ctrl K
      </kbd>
      {query.trim() ? (
        <div className="absolute left-0 right-0 top-10 z-30 overflow-hidden rounded-md border border-[#d6d6d6] bg-white p-1 shadow-xl">
          {results.length ? (
            results.map((item) => (
              <a
                className="block rounded px-3 py-2 text-xs font-medium text-[#333] hover:bg-[#f1f1f1]"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-[#777]">No workspaces found.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
