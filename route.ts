import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const { name, email, level, message } = await req.json();

    if (!email || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "ICT Website <onboarding@resend.dev>",
      to: ["admin@icttradinghub.com"],
      replyTo: email,
      subject: "New Contact Form Submission",
      text: `
Name: ${name || "-"}
Email: ${email}
Experience Level: ${level || "-"}

Message:
${message}
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Email failed" }, { status: 500 });
  }
}
