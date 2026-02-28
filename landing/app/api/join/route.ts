import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email, company, budget } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const apiKey = process.env.MAILER_API_KEY;
  const endpoint = process.env.MAILER_API_ENDPOINT;

  // When mailer is not configured: accept signup and log (dev/local). Set env vars for production.
  if (!apiKey || !endpoint) {
    console.warn(
      "[Join API] MAILER_API_KEY or MAILER_API_ENDPOINT not set. Signup accepted and logged only. For production, add them to .env.local (see .env.example)."
    );
    console.info("[Join API] Waitlist signup:", { email, company: company || "-", budget: budget || "-" });
    return NextResponse.json({ success: true });
  }

  try {
    // MailerLite: POST to /api/subscribers with { email, fields }. Bearer auth.
    const isMailerLite =
      endpoint.includes("mailerlite.com") && !endpoint.includes("/subscribers");
    const url = isMailerLite ? `${endpoint.replace(/\/$/, "")}/subscribers` : endpoint;
    const body = isMailerLite
      ? JSON.stringify({
          email,
          fields: {
            ...(company && { company }),
            ...(budget && { budget }),
          },
        })
      : JSON.stringify({ email, company, budget });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Mailer API error:", response.status, url, text);
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

