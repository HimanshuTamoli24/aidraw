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

export function ExcalidrawCanvas({
  onAPIReady,
  initialLibraryItems,
  onLibraryChange,
}: ExcalidrawCanvasProps) {
  return (
    <div className="h-full w-full">
      <Excalidraw
        excalidrawAPI={(api) => {
          onAPIReady(api);
        }}
        initialData={
          initialLibraryItems && initialLibraryItems.length > 0
            ? { libraryItems: initialLibraryItems }
            : undefined
        }
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

