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
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted"
        size={14}
      />
      <label className="sr-only" htmlFor="admin-workspace-search">
        Search admin workspaces
      </label>
      <input
        autoComplete="off"
        className="h-9 w-full rounded-md border border-admin-border bg-admin-surface-subtle pl-9 pr-14 text-xs text-admin-text-primary outline-none transition placeholder:text-admin-text-muted focus:border-admin-border-strong focus:bg-admin-surface focus:ring-2 focus:ring-admin-accent/15"
        id="admin-workspace-search"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search workspaces"
        ref={inputRef}
        type="search"
        value={query}
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-admin-border bg-admin-surface px-1.5 py-0.5 text-[9px] text-admin-text-muted">
        Ctrl K
      </kbd>
      {query.trim() ? (
        <div className="absolute left-0 right-0 top-11 z-30 overflow-hidden rounded-md border border-admin-border bg-admin-surface p-1 shadow-[0_12px_32px_rgb(25_35_29/16%)]">
          {results.length ? (
            results.map((item) => (
              <a
                className="block rounded px-3 py-2 text-xs font-medium text-admin-text-primary hover:bg-admin-surface-hover"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-admin-text-muted">No workspaces found.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
