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
}

export function ExcalidrawCanvas({ onAPIReady }: ExcalidrawCanvasProps) {
  return (
    <div className="h-full w-full">
      <Excalidraw
        excalidrawAPI={(api) => {
          onAPIReady(api);
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
