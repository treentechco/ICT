import express from "express";
import cors from "cors";
import { Resend } from "resend";

const app = express();
app.use(cors());
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, level, message } = req.body;

    if (!email || !message) {
      return res.status(400).json({ error: "Missing fields" });
    }

    await resend.emails.send({
      from: "ICT Website <onboarding@resend.dev>",
      to: ["admin@icttradinghub.com"],
      replyTo: email,
      subject: "New Contact Form Submission",
      text: `Name: ${name || "-"}\nEmail: ${email}\nExperience: ${level || "-"}\n\nMessage:\n${message}`,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Email failed" });
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
