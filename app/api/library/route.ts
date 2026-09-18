import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const libraryUrl =
      searchParams.get("url") ||
      "https://libraries.excalidraw.com/libraries/youritjang/software-architecture.excalidrawlib";

    const response = await fetch(libraryUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch library from ${libraryUrl}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Library proxy fetch error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch library" },
      { status: 500 }
    );
  }
}
