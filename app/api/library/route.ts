import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let libraryUrl =
      searchParams.get("url") ||
      "https://libraries.excalidraw.com/libraries/youritjang/software-architecture.excalidrawlib";

    libraryUrl = decodeURIComponent(libraryUrl.trim());

    const response = await fetch(libraryUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch library from ${libraryUrl} (${response.status})` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract raw items from v1 (.library), v2 (.libraryItems), or top-level array
    const rawItems =
      data.libraryItems ||
      data.library ||
      (Array.isArray(data) ? data : []);

    // Normalize into standard v2 LibraryItem array
    const normalizedItems = Array.isArray(rawItems)
      ? rawItems.map((item: any, idx: number) => {
          if (Array.isArray(item)) {
            // v1 format: item is array of ExcalidrawElement
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
        })
      : [];

    return NextResponse.json({
      type: "excalidrawlib",
      version: 2,
      libraryItems: normalizedItems,
      count: normalizedItems.length,
    });
  } catch (error: any) {
    console.error("Library proxy fetch error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch library" },
      { status: 500 }
    );
  }
}

