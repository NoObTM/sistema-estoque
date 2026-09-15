import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import nodemailer from 'nodemailer';
import { db } from './database';
import { env } from './config';

export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER
    ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
    : undefined,
});
export const auth = betterAuth({
  advanced: { ipAddress: { ipAddressHeaders: ['x-estoque-client-ip'] } },
  appName: 'Obra Estoque',
  baseURL: env.APP_URL,
  basePath: '/api/auth',
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.APP_URL],
  database: prismaAdapter(db, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await mailer.sendMail({
        from: env.MAIL_FROM,
        to: user.email,
        subject: 'Redefinir senha · Obra Estoque',
        text: `Defina sua nova senha: ${url}`,
      });
    },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'VIEWER', input: false },
      active: { type: 'boolean', defaultValue: true, input: false },
    },
  },
  session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 30 },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    customRules: { '/sign-in/email': { window: 60, max: 10 } },
  },
});
