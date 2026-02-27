import { prisma } from "./prisma";

export async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.settings.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function getSettingJson<T>(key: string): Promise<T | null> {
  const val = await getSetting(key);
  if (!val) return null;
  try {
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.settings.upsert({
    where: { key },
    update: { value },
    create: { id: key, key, value },
  });
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export interface ApiKeys {
  googlePlaces: string;
  googlePagespeed: string;
  gemini: string;
  openai: string;
  pappers: string;
  serpapi: string;
  vercelToken: string;
  vercelTeamId: string;
}

export async function getSmtpConfig(): Promise<SmtpConfig> {
  return {
    host: (await getSetting("smtp_host")) || process.env.SMTP_HOST || "",
    port: parseInt((await getSetting("smtp_port")) || process.env.SMTP_PORT || "587"),
    user: (await getSetting("smtp_user")) || process.env.SMTP_USER || "",
    pass: (await getSetting("smtp_pass")) || process.env.SMTP_PASS || "",
    from: (await getSetting("smtp_from")) || process.env.SMTP_FROM || "",
  };
}

export async function getApiKeys(): Promise<ApiKeys> {
  return {
    googlePlaces: (await getSetting("google_places_api_key")) || process.env.GOOGLE_PLACES_API_KEY || "",
    googlePagespeed: (await getSetting("google_pagespeed_api_key")) || process.env.GOOGLE_PAGESPEED_API_KEY || "",
    gemini: (await getSetting("gemini_api_key")) || process.env.GEMINI_API_KEY || "",
    openai: (await getSetting("openai_api_key")) || process.env.OPENAI_API_KEY || "",
    pappers: (await getSetting("pappers_api_key")) || process.env.PAPPERS_API_KEY || "",
    serpapi: (await getSetting("serpapi_key")) || process.env.SERPAPI_KEY || "",
    vercelToken: (await getSetting("vercel_token")) || process.env.VERCEL_TOKEN || "",
    vercelTeamId: (await getSetting("vercel_team_id")) || process.env.VERCEL_TEAM_ID || "",
  };
}
