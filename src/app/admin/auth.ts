"use server";

import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminPassword, adminToken } from "@/lib/adminAuth";

export async function login(password: string): Promise<{ ok: boolean }> {
  const pw = adminPassword();
  if (pw && password !== pw) return { ok: false };
  const store = await cookies();
  store.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return { ok: true };
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
