import nodemailer, { type Transporter } from 'nodemailer';

/// Sends the account-verification email over SMTP, e.g. a Hostinger mailbox:
///   SMTP_HOST=smtp.hostinger.com  SMTP_PORT=465
///   SMTP_USER=noreply@yourdomain.com  SMTP_PASS=...  MAIL_FROM="BoloAI <noreply@yourdomain.com>"
export interface Mailer {
  configured(): boolean;
  sendVerificationCode(to: string, code: string): Promise<void>;
}

let transport: Transporter | undefined;

export const smtpMailer: Mailer = {
  configured: () => Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()),

  async sendVerificationCode(to, code) {
    if (!this.configured()) {
      // Local development without a mailbox: the code appears in the server log.
      if (process.env.NODE_ENV === 'production') throw new Error('SMTP is not configured');
      console.log(`[mail] verification code for ${to}: ${code} (SMTP not configured)`);
      return;
    }
    const port = Number(process.env.SMTP_PORT ?? 465);
    transport ??= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({
      from: process.env.MAIL_FROM?.trim() || `BoloAI <${process.env.SMTP_USER}>`,
      to,
      subject: `${code} is your BoloAI verification code`,
      text: `Your BoloAI verification code is ${code}.\n\nIt expires in 10 minutes. If you didn't create a BoloAI account, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1c1917">
  <h2 style="margin:0 0 8px">Verify your email</h2>
  <p style="margin:0 0 20px;color:#57534e">Enter this code in BoloAI to finish creating your account.</p>
  <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:0 0 20px">${code}</p>
  <p style="margin:0;color:#78716c;font-size:13px">The code expires in 10 minutes. If you didn't create a BoloAI account, you can ignore this email.</p>
</div>`,
    });
  },
};
