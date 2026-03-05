import type { Env } from "../env";
import { sendEmail } from "./client";

export async function sendVerificationEmail(env: Env, email: string, token: string): Promise<void> {
  const domain = env.DOMAIN;
  const html = `
    <h2>Verify Your Email</h2>
    <p>Click the link below to verify your email address:</p>
    <a href="${domain}/verify-email?token=${token}">Verify Email</a>
    <p>If you didn't create an account, ignore this email.</p>
  `;
  await sendEmail(env, email, "Verify Your Email - HonoWarden", html);
}

export async function sendTwoFactorEmail(env: Env, email: string, code: string): Promise<void> {
  const html = `
    <h2>Two-Factor Authentication</h2>
    <p>Your verification code is:</p>
    <h1 style="letter-spacing: 0.3em; font-family: monospace;">${code}</h1>
    <p>This code expires in 10 minutes.</p>
  `;
  await sendEmail(env, email, "Two-Factor Authentication Code - HonoWarden", html);
}

export async function sendInviteEmail(env: Env, email: string, orgName: string, token: string): Promise<void> {
  const domain = env.DOMAIN;
  const html = `
    <h2>Organization Invitation</h2>
    <p>You have been invited to join <strong>${orgName}</strong>.</p>
    <a href="${domain}/#/accept-organization?token=${token}">Accept Invitation</a>
  `;
  await sendEmail(env, email, `Join ${orgName} - HonoWarden`, html);
}

export async function sendEmergencyAccessInvite(env: Env, email: string, grantorName: string, token: string): Promise<void> {
  const domain = env.DOMAIN;
  const html = `
    <h2>Emergency Access Invitation</h2>
    <p><strong>${grantorName}</strong> has invited you as an emergency contact.</p>
    <a href="${domain}/#/accept-emergency?token=${token}">Accept</a>
  `;
  await sendEmail(env, email, "Emergency Access Invitation - HonoWarden", html);
}

export async function sendPasswordHint(env: Env, email: string, hint: string): Promise<void> {
  const html = `
    <h2>Master Password Hint</h2>
    <p>Your master password hint is:</p>
    <p><strong>${hint || "(No hint set)"}</strong></p>
  `;
  await sendEmail(env, email, "Master Password Hint - HonoWarden", html);
}

export async function sendWelcomeEmail(env: Env, email: string): Promise<void> {
  const domain = env.DOMAIN;
  const html = `
    <h2>Welcome to HonoWarden</h2>
    <p>Your account has been created.</p>
    <a href="${domain}">Open your vault</a>
  `;
  await sendEmail(env, email, "Welcome to HonoWarden", html);
}
