require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, level, message } = req.body;

    if (!email || !message) {
      return res.status(400).json({ error: "Missing email/message" });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: "RESEND_API_KEY not found in .env" });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "ICT Website <onboarding@resend.dev>",
      to: ["admin@icttradinghub.com"],
      replyTo: email,
      subject: "New Contact Form Submission",
      text:
        `Name: ${name || "-"}\n` +
        `Email: ${email}\n` +
        `Experience: ${level || "-"}\n\n` +
        `Message:\n${message || "-"}`,
    });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({
      error: "Email failed",
      details: String(err?.message || err),
    });
  }
});

app.listen(5000, () => console.log("Server: http://localhost:5000"));
