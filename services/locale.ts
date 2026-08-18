'use server';

import { cookies } from 'next/headers';
import { Locale, defaultLocale } from '@/i18n/config';
import { LOCALE_COOKIE_NAME } from '@/utils/localeConstants';

export async function getUserLocale() {
  return (await cookies()).get(LOCALE_COOKIE_NAME)?.value || defaultLocale;
}

export async function setUserLocale(locale: Locale) {
  (await cookies()).set(LOCALE_COOKIE_NAME, locale);
}
