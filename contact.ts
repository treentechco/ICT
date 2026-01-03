import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, level, message } = req.body;

    if (!email || !message) {
      return res.status(400).json({ error: "Missing fields" });
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
Experience: ${level || "-"}

Message:
${message}
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Email failed" });
  }
}
