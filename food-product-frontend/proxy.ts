import { NextResponse, type NextRequest } from "next/server";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  type Locale,
} from "@/i18n/config";

function parseAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;

  const preferences = header
    .split(",")
    .map((part) => {
      const [tag = "", qualityPart] = part.trim().split(";q=");
      return {
        language: tag.split("-")[0]?.toLowerCase() ?? "",
        quality: qualityPart ? Number(qualityPart) : 1,
      };
    })
    .filter((entry) => Number.isFinite(entry.quality))
    .sort((a, b) => b.quality - a.quality);

  for (const { language } of preferences) {
    if (isSupportedLocale(language)) return language;
  }

  return null;
}

function resolveLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isSupportedLocale(cookieLocale)) return cookieLocale;

  return parseAcceptLanguage(request.headers.get("accept-language")) ?? DEFAULT_LOCALE;
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const hasLocale = SUPPORTED_LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (hasLocale) return NextResponse.next();

  const locale = resolveLocale(request);
  const redirectUrl = new URL(`/${locale}${pathname === "/" ? "" : pathname}`, request.url);
  redirectUrl.search = request.nextUrl.search;

  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\..*).*)"],
};
