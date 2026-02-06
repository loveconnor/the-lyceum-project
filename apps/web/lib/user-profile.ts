import type { User } from "@supabase/supabase-js";

import type { UserProfile } from "@/types/user";

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "Guest User",
  email: "guest@example.com",
  avatarUrl: "/images/avatars/01.png"
};

export function splitFullName(name?: string | null): [string | null, string | null] {
  if (!name) return [null, null];
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return [null, null];
  if (parts.length === 1) return [parts[0], null];
  const first = parts.shift() ?? null;
  const last = parts.join(" ") || null;
  return [first, last];
}

export function mapUserToProfile(user?: User | null): UserProfile {
  if (!user) {
    return DEFAULT_USER_PROFILE;
  }

  const metadataSource = user.user_metadata;
  const metadata =
    metadataSource && typeof metadataSource === "object"
      ? (metadataSource as Record<string, unknown>)
      : {};
  const getMetadataString = (key: string) => {
    const value = metadata[key];
    return typeof value === "string" ? value : undefined;
  };
  const name =
    getMetadataString("full_name") ??
    getMetadataString("name") ??
    getMetadataString("display_name") ??
    user.email?.split("@")?.[0] ??
    DEFAULT_USER_PROFILE.name;

  const avatarUrl =
    getMetadataString("avatar_url") ??
    getMetadataString("picture") ??
    DEFAULT_USER_PROFILE.avatarUrl;

  return {
    id: user.id,
    name,
    email: user.email ?? DEFAULT_USER_PROFILE.email,
    avatarUrl
  };
}

export function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim();
  if (!source) return "?";

  const parts = source.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[1][0]).toUpperCase();
}
