import { ComfyJSInstance } from 'comfy.js';
import { RefObject, useCallback, useEffect, useRef, useState, startTransition } from 'react';
import { useTranslations } from 'next-intl';

type QueueEntry = {
  id: string;
  name: string;
  url: string;
  viewer: string;
  addedAt: number;
};

type SongMap = Record<
  string,
  {
    name: string;
    url: string;
  }
>;

let comfySingleton: ComfyJSInstance | null = null;
let isComfyInitialized = false;
let commandHandlerRegistered = false;

interface UseTwitchChatProps {
  channel: string;
  songsRef: RefObject<SongMap>;
  onQueueAdd: (entry: QueueEntry) => void;
  onToast: (message: string, type?: 'error' | 'success' | 'info') => void;
}

export function useTwitchChat({ channel, songsRef, onQueueAdd, onToast }: UseTwitchChatProps) {
  const t = useTranslations('Page');

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('twitch_oauth_token');
  });

  const isMountedRef = useRef(true);
  const lastProcessedId = useRef('');
  const lastProcessedTime = useRef(0);
  const hasShownConnectionToast = useRef(false);
  const hasProcessedOAuth = useRef(false); // prevent double processing

  // Reset connection toast flag
  const resetConnectionToastFlag = useCallback(() => {
    hasShownConnectionToast.current = false;
  }, []);

  // Command handler
  const handleCommand = useCallback(
    (user: string, command: string, message: string) => {
      const cmd = command.toLowerCase();
      if (cmd !== 'addsong' && cmd !== '點歌' && cmd !== 'うた') return;

      const id = message.trim().split(/\s+/)[0]?.toUpperCase();
      if (!id) return;

      const now = Date.now();
      if (id === lastProcessedId.current && now - lastProcessedTime.current < 500) {
        return;
      }

      lastProcessedId.current = id;
      lastProcessedTime.current = now;

      const song = songsRef.current[id];
      const entry = song
        ? {
            id,
            name: song.name,
            url: song.url,
            viewer: user || 'viewer',
            addedAt: Date.now(),
          }
        : null;

      if (!entry) {
        const errorMessage = t('errors.songIdNotFound', { id });
        if (comfySingleton && isComfyInitialized) {
          try {
            // @ts-expect-error Say method exists
            comfySingleton.Say(`@${user} ${errorMessage}`);
          } catch {
            // ignore
          }
        }
        onToast(errorMessage, 'error');
        return;
      }

      // Send chat confirmation
      if (comfySingleton && isComfyInitialized) {
        try {
          const queuePosition = 0;
          const confirmMessage = t('chat.confirmation', {
            user: user,
            id: id,
            name: entry.name,
            position: queuePosition,
          });
          // @ts-expect-error Say method exists
          comfySingleton.Say(`@${user} ${confirmMessage}`);
        } catch {
          // ignore
        }
      }

      const toastMsg = t('chat.confirmation', {
        user: user,
        id: id,
        name: entry.name,
        position: 0,
      });
      onToast(toastMsg, 'success');
      onQueueAdd(entry);
    },
    [songsRef, onQueueAdd, onToast, t],
  );

  // Initialize ComfyJS (without token by default)
  const initializeComfyJS = useCallback(async () => {
    if (!channel || !isMountedRef.current) return;

    try {
      // Clean up existing connection
      if (comfySingleton && isComfyInitialized) {
        try {
          if (comfySingleton.onCommand) {
            comfySingleton.onCommand = () => {};
          }
          if (comfySingleton.Disconnect) {
            comfySingleton.Disconnect();
          }
        } catch {
          // no-op
        }
        isComfyInitialized = false;
        commandHandlerRegistered = false;
        resetConnectionToastFlag();
      }

      const mod = await import('comfy.js');
      const comfy = (mod?.default || mod) as ComfyJSInstance;
      if (!comfy || !isMountedRef.current) return;

      comfySingleton = comfy;

      const token = localStorage.getItem('twitch_oauth_token');

      if (token) {
        comfy.Init(channel, token);
        startTransition(() => {
          if (isMountedRef.current) setIsAuthenticated(true);
        });
      } else {
        comfy.Init(channel);
        startTransition(() => {
          if (isMountedRef.current) setIsAuthenticated(false);
        });
      }

      isComfyInitialized = true;

      if (!commandHandlerRegistered) {
        comfy.onCommand = handleCommand;
        commandHandlerRegistered = true;
      }

      if (isMountedRef.current) {
        comfy.onConnected = () => {
          const token = localStorage.getItem('twitch_oauth_token');
          if (token && comfySingleton && isComfyInitialized) {
            if (!hasShownConnectionToast.current) {
              hasShownConnectionToast.current = true;
              onToast(t('chat.botConnected'), 'success');
            }
          }
        };
      }
    } catch (e) {
      console.error('ComfyJS init failed', e);
    }
  }, [channel, handleCommand, t, onToast, resetConnectionToastFlag]);

  // Handle OAuth token from URL hash – run only once on mount
  useEffect(() => {
    if (typeof window === 'undefined' || hasProcessedOAuth.current) return;

    const hash = window.location.hash;
    if (!hash) return;

    const hashParams = new URLSearchParams(hash.substring(1));
    const accessToken = hashParams.get('access_token');

    if (accessToken) {
      hasProcessedOAuth.current = true;

      // Save token
      localStorage.setItem('twitch_oauth_token', accessToken);

      startTransition(() => {
        setIsAuthenticated(true);
      });

      // Clean URL
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search,
      );

      // Reinitialize with the new token
      void initializeComfyJS();
    }
  }, [initializeComfyJS]);

  // Main initialization effect (when channel changes or after OAuth)
  useEffect(() => {
    isMountedRef.current = true;

    // If we already have a token and the channel exists, initialize
    if (channel && !hasProcessedOAuth.current) {
      // If we have a token, we can initialize; but we might still be processing OAuth
      // To avoid race, we only initialize if we're not waiting for OAuth redirect.
      // We can simply call initializeComfyJS, which will read the token.
      void initializeComfyJS();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [channel, initializeComfyJS]);

  // Connect/disconnect Twitch OAuth
  const connectTwitch = useCallback(() => {
    const token = localStorage.getItem('twitch_oauth_token');

    if (token) {
      // Disconnect
      localStorage.removeItem('twitch_oauth_token');
      startTransition(() => {
        setIsAuthenticated(false);
      });
      resetConnectionToastFlag();

      if (comfySingleton && isComfyInitialized && channel) {
        try {
          if (comfySingleton.onCommand) {
            comfySingleton.onCommand = () => {};
          }
          if (comfySingleton.Disconnect) {
            comfySingleton.Disconnect();
          }
          isComfyInitialized = false;
          commandHandlerRegistered = false;
          comfySingleton.Init(channel);
          isComfyInitialized = true;
          comfySingleton.onCommand = handleCommand;
          commandHandlerRegistered = true;
        } catch (e) {
          console.error('Failed to disconnect ComfyJS', e);
        }
      }
      return 'disconnected';
    } else {
      // Connect
      const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
      if (!clientId) {
        throw new Error(t('auth.missingClientId'));
      }
      const redirectUri = window.location.origin;
      window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=chat:read+chat:edit`;
      return 'redirecting';
    }
  }, [channel, handleCommand, t, resetConnectionToastFlag]);

  // Reset connection
  const resetConnection = useCallback(() => {
    if (comfySingleton && isComfyInitialized) {
      try {
        if (comfySingleton.onCommand) {
          comfySingleton.onCommand = () => {};
        }
        if (comfySingleton.Disconnect) {
          comfySingleton.Disconnect();
        }
        isComfyInitialized = false;
        commandHandlerRegistered = false;
        resetConnectionToastFlag();
      } catch (e) {
        console.error('Failed to reset ComfyJS', e);
      }
    }
    localStorage.removeItem('twitch_oauth_token');
    startTransition(() => {
      setIsAuthenticated(false);
    });
  }, [resetConnectionToastFlag]);

  return {
    isAuthenticated,
    connectTwitch,
    resetConnection,
    initializeComfyJS,
    setIsAuthenticated,
  };
}
