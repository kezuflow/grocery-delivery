"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "./cn";

export type Tab = Readonly<{
  id: string;
  label: ReactNode;
  content: ReactNode;
}>;

export function getNextTabIndex({
  currentIndex,
  key,
  tabCount,
}: Readonly<{
  currentIndex: number;
  key: string;
  tabCount: number;
}>) {
  if (tabCount === 0) return currentIndex;
  if (key === "Home") return 0;
  if (key === "End") return tabCount - 1;
  if (key === "ArrowRight") return (currentIndex + 1) % tabCount;
  if (key === "ArrowLeft") return (currentIndex - 1 + tabCount) % tabCount;
  return currentIndex;
}

export function Tabs({
  tabs,
  defaultTab,
  className,
}: Readonly<{
  tabs: readonly Tab[];
  defaultTab?: string;
  className?: string;
}>) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? "");
  const tabsId = useId();
  const selectedTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  function selectTabFromKeyboard(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    const nextIndex = getNextTabIndex({ currentIndex, key: event.key, tabCount: tabs.length });
    if (nextIndex === currentIndex && !["Home", "End"].includes(event.key)) return;

    const nextTab = tabs[nextIndex];
    if (!nextTab) return;

    event.preventDefault();
    setActiveTab(nextTab.id);
    document.getElementById(`${tabsId}-${nextTab.id}-tab`)?.focus();
  }

  if (!selectedTab) return null;

  return (
    <div className={cn("grid gap-4", className)}>
      <div
        aria-label="Sections"
        className="flex gap-1 overflow-x-auto border-b border-line"
        role="tablist"
      >
        {tabs.map((tab) => {
          const selected = tab.id === selectedTab.id;
          const tabId = `${tabsId}-${tab.id}`;
          return (
            <button
              aria-controls={`${tabId}-panel`}
              aria-selected={selected}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep",
                selected ? "border-deep text-deep" : "border-transparent text-muted hover:text-ink",
              )}
              id={`${tabId}-tab`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => selectTabFromKeyboard(event, tabs.indexOf(tab))}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        aria-labelledby={`${tabsId}-${selectedTab.id}-tab`}
        id={`${tabsId}-${selectedTab.id}-panel`}
        role="tabpanel"
        tabIndex={0}
      >
        {selectedTab.content}
      </div>
    </div>
  );
}
