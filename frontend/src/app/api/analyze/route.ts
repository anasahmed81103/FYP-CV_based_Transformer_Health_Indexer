import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

    const res = await fetch(`${backendUrl}/predict`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/analyze:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
