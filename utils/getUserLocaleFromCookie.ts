import { LOCALE_COOKIE_NAME } from './localeConstants';

export function getUserLocaleFromCookie(): string {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : 'en';
  }
  return 'en-US';
}
