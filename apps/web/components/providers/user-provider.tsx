"use client";

import React, { createContext, useContext } from "react";

import type { UserProfile } from "@/types/user";
import { DEFAULT_USER_PROFILE } from "@/lib/user-profile";

const UserContext = createContext<UserProfile>(DEFAULT_USER_PROFILE);

export function UserProvider({
  user = DEFAULT_USER_PROFILE,
  children
}: {
  user?: UserProfile;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user ?? DEFAULT_USER_PROFILE}>{children}</UserContext.Provider>;
}

export function useUserProfile() {
  return useContext(UserContext);
}
