// utils/twitchHelpers.ts

export const getTwitchToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('twitch_oauth_token');
};

export const setTwitchToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('twitch_oauth_token', token);
};

export const removeTwitchToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('twitch_oauth_token');
};

export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('twitch_oauth_token');
};

export const getTwitchAuthUrl = (): string => {
  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  if (!clientId) {
    throw new Error('NEXT_PUBLIC_TWITCH_CLIENT_ID is not set');
  }

  const redirectUri = typeof window !== 'undefined' ? window.location.origin : '';
  return `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=chat:read+chat:edit`;
};

export const extractTokenFromHash = (): string | null => {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash;
  if (!hash) return null;

  const hashParams = new URLSearchParams(hash.substring(1));
  return hashParams.get('access_token');
};

export const cleanUrlHash = (): void => {
  if (typeof window === 'undefined') return;

  window.history.replaceState(
    {},
    document.title,
    window.location.pathname + window.location.search,
  );
};
