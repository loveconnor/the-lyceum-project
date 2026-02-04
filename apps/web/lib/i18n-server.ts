import { cookies } from "next/headers";
import { LANGUAGE_COOKIE_NAME, createTranslator, getLocaleFromString } from "@/lib/i18n";

export async function getServerLocale() {
  const cookieStore = await cookies();
  const locale = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value ?? null;
  return getLocaleFromString(locale);
}

export async function getServerTranslator() {
  const locale = await getServerLocale();
  return createTranslator(locale);
}

