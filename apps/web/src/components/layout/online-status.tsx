"use client";

import { useEffect, useState } from "react";

export function OnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    function updateStatus() {
      setOnline(window.navigator.onLine);
    }

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (online) return null;

  return (
    <div className="bg-warning px-4 py-2 text-center text-sm font-bold text-white" role="status">
      You are offline. Previously loaded information remains available, but updates may wait to
      sync.
    </div>
  );
}
