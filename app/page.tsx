"use client";

import { useEffect, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { ExcalidrawCanvas } from "@/components/diagram/ExcalidrawCanvas";
import { ChatSidebar } from "@/components/diagram/ChatSidebar";
import { libraryStore } from "@/lib/diagram/library/libraryManager";

const DEFAULT_LIBRARY_URL =
  "https://libraries.excalidraw.com/libraries/youritjang/software-architecture.excalidrawlib";

export default function Home() {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);

  useEffect(() => {
    if (!excalidrawAPI) return;

    // Helper to fetch library JSON (via backend proxy to bypass CORS)
    const loadLibraryFromUrl = async (url: string) => {
      try {
        const response = await fetch(`/api/library?url=${encodeURIComponent(url)}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch Excalidraw library from ${url}`);
        }

        const library = await response.json();
        const libraryItems = library.libraryItems || (Array.isArray(library) ? library : []);

        if (libraryItems.length > 0) {
          // 1. Update Excalidraw's Library Panel UI
          excalidrawAPI.updateLibrary({
            libraryItems,
            merge: true,
          });

          // 2. Register items with the AI Diagram Generator Store
          libraryStore.registerLibraryItems(libraryItems);
          console.log(`[Excalidraw] Loaded ${libraryItems.length} library items for AI generator.`);
        }
      } catch (error) {
        console.error("Failed to load Excalidraw library:", error);
      }
    };

    // 1. Check if URL hash contains #addLibrary=...
    const handleHashLibrary = () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash;
      if (hash && hash.includes("addLibrary=")) {
        const match = hash.match(/addLibrary=([^&]+)/);
        if (match && match[1]) {
          const libraryUrl = decodeURIComponent(match[1]);
          loadLibraryFromUrl(libraryUrl);
        }
      }
    };

    // 2. Pre-load default Software Architecture Library
    loadLibraryFromUrl(DEFAULT_LIBRARY_URL);

    // 3. Listen for dynamic #addLibrary= URL imports
    handleHashLibrary();
    window.addEventListener("hashchange", handleHashLibrary);
    return () => {
      window.removeEventListener("hashchange", handleHashLibrary);
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
        />
      </div>

      {/* AI Whiteboard Architect Chat Sidebar */}
      <ChatSidebar excalidrawAPI={excalidrawAPI} />
    </main>
  );
}
