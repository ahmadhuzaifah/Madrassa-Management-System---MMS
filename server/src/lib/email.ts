import nodemailer from 'nodemailer';

export const sendEmail = async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.info(`[email] ${subject} -> ${to}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'Northstar SaaS <no-reply@northeast.example>',
    to,
    subject,
    html,
  });
};

export const emailTemplates = {
  verification: (name: string, token: string) => `<p>Hello ${name},</p><p>Your verification token is <strong>${token}</strong>.</p>`,
  passwordReset: (name: string, token: string) => `<p>Hello ${name},</p><p>Your password reset token is <strong>${token}</strong>.</p>`,
  welcome: (name: string) => `<p>Welcome ${name},</p><p>Your account is ready.</p>`,
  activated: (name: string) => `<p>Hello ${name},</p><p>Your account has been activated.</p>`,
};
