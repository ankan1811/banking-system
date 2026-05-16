// import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  // if (process.env.RESEND_API_KEY) {
  //   try {
  //     const resend = new Resend(process.env.RESEND_API_KEY);
  //     await resend.emails.send({
  //       from: process.env.EMAIL_FROM || "Ankan's Bank <noreply@example.com>",
  //       to,
  //       subject,
  //       html,
  //     });
  //     return;
  //   } catch (err) {
  //     console.warn('Resend failed, falling back to Gmail SMTP:', err);
  //   }
  // }

  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
  });

  await transport.sendMail({
    from: process.env.EMAIL_FROM || `Ankan's Bank <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
    text: html.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim(),
  });
}
