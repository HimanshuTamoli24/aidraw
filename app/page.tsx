// "use client";

// import { useState } from "react";
// import { Editor, Tldraw } from "tldraw";
// import "tldraw/tldraw.css";
// import { ChatSidebar } from "@/components/diagram/ChatSidebar";

// export default function Home() {
//   const [editor, setEditor] = useState<Editor | null>(null);

//   return (
//     <main className="relative w-screen h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
//       {/* Interactive Tldraw Canvas */}
//       <div className="fixed inset-0">
//         <Tldraw
//           onMount={(mountedEditor) => {
//             setEditor(mountedEditor);
//           }}
//         />
//       </div>

//       {/* AI Whiteboard Architect Chat Sidebar */}
//       <ChatSidebar editor={editor} />
//     </main>
//   );
// }

"use client";

import { useState } from "react";
import { ChatSidebar } from "@/components/diagram/ChatSidebar";

export default function Home() {
  const [editor, setEditor] = useState<Editor | null>(null);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Interactive Tldraw Canvas */}
      <div className="fixed inset-0">
        <Excalidraw
          onMount={(mountedEditor) => {
            setEditor(mountedEditor);
          }}
        />
      </div>

      {/* AI Whiteboard Architect Chat Sidebar */}
      <ChatSidebar editor={editor} />
    </main>
  );
}
