"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-sm font-medium text-zinc-500 animate-pulse">
          Loading Excalidraw canvas...
        </div>
      </div>
    ),
  }
);

interface ExcalidrawCanvasProps {
  onAPIReady: (api: ExcalidrawImperativeAPI) => void;
  initialLibraryItems?: any[];
  onLibraryChange?: (libraryItems: any) => void;
}

const CANVAS_STORAGE_KEY = "aidraw_canvas_elements";
const APP_STATE_STORAGE_KEY = "aidraw_canvas_appstate";

function getSavedCanvasData(): { elements: any[]; appState: any } {
  if (typeof window === "undefined") return { elements: [], appState: {} };
  try {
    const rawElements = localStorage.getItem(CANVAS_STORAGE_KEY);
    const rawState = localStorage.getItem(APP_STATE_STORAGE_KEY);
    const elements = rawElements ? JSON.parse(rawElements) : [];
    const appState = rawState ? JSON.parse(rawState) : {};
    return {
      elements: Array.isArray(elements) ? elements : [],
      appState: appState && typeof appState === "object" ? appState : {},
    };
  } catch (e) {
    console.warn("[Canvas] Failed to read saved canvas elements from localStorage:", e);
    return { elements: [], appState: {} };
  }
}

export function ExcalidrawCanvas({
  onAPIReady,
  initialLibraryItems,
  onLibraryChange,
}: ExcalidrawCanvasProps) {
  const [initialScene, setInitialScene] = React.useState<{ elements: any[]; appState: any } | null>(null);
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Load saved canvas drawings on client mount
  React.useEffect(() => {
    const data = getSavedCanvasData();
    setInitialScene(data);
  }, []);

  // Debounced auto-save for all drawn elements and view state
  const handleChange = React.useCallback((elements: readonly any[], appState: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const nonDeleted = elements.filter((el) => !el.isDeleted);
        localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(nonDeleted));
        if (appState) {
          const stateToSave = {
            theme: appState.theme,
            zoom: appState.zoom,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
          };
          localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(stateToSave));
        }
      } catch (err) {
        console.warn("[Canvas] Failed to auto-save drawings to localStorage:", err);
      }
    }, 300);
  }, []);

  // Wait until saved scene is read from localStorage so initial render contains all drawings
  if (!initialScene) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-sm font-medium text-zinc-500 animate-pulse">
          Restoring whiteboard canvas...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Excalidraw
        excalidrawAPI={(api) => {
          onAPIReady(api);
        }}
        initialData={{
          elements: initialScene.elements,
          appState: {
            ...initialScene.appState,
            isLoading: false,
          },
          libraryItems:
            initialLibraryItems && initialLibraryItems.length > 0
              ? initialLibraryItems
              : undefined,
        }}
        onChange={handleChange}
        onLibraryChange={(items) => {
          onLibraryChange?.(items);
        }}
        UIOptions={{
          canvasActions: {
            loadScene: true,
            saveToActiveFile: true,
            export: { saveFileToDisk: true },
            toggleTheme: true,
          },
        }}
      />
    </div>
  );
}


