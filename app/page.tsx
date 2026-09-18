"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { ExcalidrawCanvas } from "@/components/diagram/ExcalidrawCanvas";
import { ChatSidebar } from "@/components/diagram/ChatSidebar";
import { libraryStore } from "@/lib/diagram/library/libraryManager";

const STORAGE_KEY = "excalidraw-custom-library";
const DEFAULT_LIBRARY_URL =
  "https://libraries.excalidraw.com/libraries/youritjang/software-architecture.excalidrawlib";

function getSavedLibraryItems(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("[Library] Failed to read saved library from localStorage:", e);
  }
  return [];
}

import defaultArchLib from "@/public/libraries/default-architecture.json";

export default function Home() {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [initialLibraryItems, setInitialLibraryItems] = useState<any[]>([]);
  const hasLoadedInitial = useRef(false);

  // Load bundled + saved library items once on client mount
  useEffect(() => {
    const saved = getSavedLibraryItems();
    const defaults = (defaultArchLib?.libraryItems as any[]) || [];
    const combined = [...defaults, ...saved];
    const unique = Array.from(
      new Map(combined.map((it) => [it.id || it.name || JSON.stringify(it.elements?.[0]?.id), it])).values()
    );
    setInitialLibraryItems(unique);
    libraryStore.registerLibraryItems(unique);
    console.log(`[Library] Loaded ${unique.length} library items into canvas and AI generator.`);
  }, []);


  // Save changes whenever user adds/removes library items in Excalidraw UI
  const handleLibraryChange = useCallback((items: readonly any[]) => {
    if (!items || items.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      libraryStore.registerLibraryItems(items as any[]);
    } catch (e) {
      console.warn("[Library] Failed to save library change to localStorage:", e);
    }
  }, []);

  useEffect(() => {
    if (!excalidrawAPI) return;

    // Helper to fetch library JSON (via backend proxy to bypass CORS)
    const loadLibraryFromUrl = async (url: string) => {
      try {
        const response = await fetch(`/api/library?url=${encodeURIComponent(url)}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch library from ${url} (${response.status})`);
        }

        const data = await response.json();
        const rawItems =
          data.libraryItems ||
          data.library ||
          (Array.isArray(data) ? data : []);

        if (Array.isArray(rawItems) && rawItems.length > 0) {
          // Normalize into standard v2 LibraryItem array
          const normalizedItems = rawItems.map((item: any, idx: number) => {
            if (Array.isArray(item)) {
              return {
                id: `lib-item-${idx}-${Date.now()}`,
                status: "published" as const,
                elements: item,
                created: Date.now(),
              };
            }
            if (item && item.elements) {
              return {
                id: item.id || `lib-item-${idx}-${Date.now()}`,
                status: item.status || "published",
                elements: item.elements,
                created: item.created || Date.now(),
                name: item.name,
              };
            }
            return item;
          });

          // 1. Update Excalidraw's Library Panel UI & open panel
          await excalidrawAPI.updateLibrary({
            libraryItems: normalizedItems,
            merge: true,
            openLibraryMenu: true,
            defaultStatus: "published",
          });

          // 2. Register items with the AI Diagram Generator Store
          libraryStore.registerLibraryItems(normalizedItems);

          // 3. Persist to localStorage so items survive page reload
          const existing = getSavedLibraryItems();
          const combined = [...existing, ...normalizedItems];
          const unique = Array.from(new Map(combined.map((it) => [it.id || JSON.stringify(it.elements?.[0]?.id), it])).values());
          localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));

          console.log(`[Excalidraw] Loaded and persisted ${normalizedItems.length} library items.`);
        }
      } catch (error) {
        console.error("Failed to load Excalidraw library:", error);
      }
    };

    // Check if URL hash or search contains #addLibrary=... or ?addLibrary=...
    const checkAndLoadUrlLibrary = () => {
      if (typeof window === "undefined") return;

      let libraryUrl: string | null = null;

      // Check hash
      if (window.location.hash.includes("addLibrary=")) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        libraryUrl = hashParams.get("addLibrary");
      }

      // Check search query fallback
      if (!libraryUrl && window.location.search.includes("addLibrary=")) {
        const searchParams = new URLSearchParams(window.location.search);
        libraryUrl = searchParams.get("addLibrary");
      }

      if (libraryUrl) {
        loadLibraryFromUrl(libraryUrl).then(() => {
          // Clean the hash from the browser URL so it doesn't re-trigger
          try {
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (e) {
            // ignore
          }
        });
      }
    };

    // Initial check
    checkAndLoadUrlLibrary();

    // If localStorage was empty, pre-load default Software Architecture Library
    if (!hasLoadedInitial.current) {
      hasLoadedInitial.current = true;
      const saved = getSavedLibraryItems();
      if (saved.length === 0) {
        loadLibraryFromUrl(DEFAULT_LIBRARY_URL);
      }
    }

    window.addEventListener("hashchange", checkAndLoadUrlLibrary);
    return () => {
      window.removeEventListener("hashchange", checkAndLoadUrlLibrary);
    };
  }, [excalidrawAPI]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Interactive Excalidraw Canvas */}
      <div className="fixed inset-0">
        <ExcalidrawCanvas
          onAPIReady={(api) => {
            setExcalidrawAPI(api);
          }}
          initialLibraryItems={initialLibraryItems}
          onLibraryChange={handleLibraryChange}
        />
      </div>

      {/* AI Whiteboard Architect Chat Sidebar */}
      <ChatSidebar excalidrawAPI={excalidrawAPI} />
    </main>
  );
}

