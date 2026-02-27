import nodemailer from "nodemailer";
import { getSmtpConfig } from "./settings";

export async function sendEmail(to: string, subject: string, html: string) {
  const config = await getSmtpConfig();

  if (!config.host || !config.user) {
    throw new Error("SMTP not configured. Go to Settings to configure email.");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const result = await transporter.sendMail({
    from: config.from,
    to,
    subject,
    html,
  });

  return result;
}
