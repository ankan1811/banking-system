// import { Resend } from 'resend';
import nodemailer from 'nodemailer';

async function sendEmailAsync(to: string, subject: string, html: string): Promise<void> {
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
    connectionTimeout: 5000,
    socketTimeout: 5000,
  });

  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || `Ankan's Bank <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text: html.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim(),
    });
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
  } finally {
    transport.close();
  }
}

export function sendEmail(to: string, subject: string, html: string): void {
  sendEmailAsync(to, subject, html);
}
