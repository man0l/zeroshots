import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email, company, budget } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const apiKey = process.env.MAILER_API_KEY;
  const endpoint = process.env.MAILER_API_ENDPOINT;

  // Email signup requires MAILER_API_KEY and MAILER_API_ENDPOINT in .env
  if (!apiKey || !endpoint) {
    console.warn(
      "Join API: MAILER_API_KEY or MAILER_API_ENDPOINT not set. Copy .env.example to .env and add your mailer credentials."
    );
    return NextResponse.json(
      { error: "Signup is not available right now. Please try again later." },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email,
        company,
        budget,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Mailer API error:", response.status, text);
      return NextResponse.json(
        { error: "We couldn't add you to the list. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mailer API request failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

