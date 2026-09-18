import { NextRequest, NextResponse } from "next/server";
import { generateDiagramFromGroq } from "@/lib/groq";
import { z } from "zod";

const RequestBodySchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty"),
  currentDiagram: z.any().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RequestBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues.map((i) => i.message).join(", "),
        },
        { status: 400 }
      );
    }

    const { prompt, currentDiagram, history } = parsed.data;

    const diagram = await generateDiagramFromGroq(
      prompt,
      currentDiagram,
      history
    );

    return NextResponse.json({
      success: true,
      diagram,
      explanation: diagram.explanation || diagram.summary || "Diagram generated successfully.",
    });
  } catch (error: any) {
    console.error("Error generating diagram:", error);

    const errorMessage =
      error?.message ||
      "Failed to generate technical diagram. Please try again with a descriptive prompt.";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
