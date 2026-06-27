import { client } from "./sanity";

export type UserRole = "admin" | "editor";

export type FlatplanUser = {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  byline?: string;
  jobTitle?: string;
  bio?: string;
  photoUrl?: string;
  role: UserRole;
  active: boolean;
};

const USER_FIELDS = `_id, email, firstName, lastName, byline, jobTitle, bio,
  "photoUrl": photo.asset->url, role, active`;

// Look up an active user by email (case-insensitive — emails are stored
// lowercased on write). Returns null for unknown or deactivated users.
export async function getUserByEmail(email: string): Promise<FlatplanUser | null> {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return null;
  const u: FlatplanUser | null = await client.fetch(
    `*[_type == "user" && email == $email && active == true][0]{ ${USER_FIELDS} }`,
    { email: e },
    { cache: "no-store" }
  );
  return u ?? null;
}

// All users (active and deactivated) for the admin management panel.
export async function listAllUsers(): Promise<FlatplanUser[]> {
  const users: FlatplanUser[] = await client.fetch(
    `*[_type == "user"] | order(active desc, firstName asc, email asc){ ${USER_FIELDS} }`,
    {},
    { cache: "no-store" }
  );
  return users ?? [];
}

export function fullName(u: { firstName?: string; lastName?: string; email?: string }): string {
  const n = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return n || u.email || "Unknown";
}
