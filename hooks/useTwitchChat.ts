// hooks/useTwitchChat.ts
import { ComfyJSInstance } from 'comfy.js';
import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
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

// Singleton pattern for ComfyJS instance
let comfySingleton: ComfyJSInstance | null = null;
let isComfyInitialized = false;
let commandHandlerRegistered = false;

interface UseTwitchChatProps {
  channel: string;
  songsRef: RefObject<SongMap>;
  onQueueAdd: (entry: QueueEntry) => void;
  onError: (error: string) => void;
}

export function useTwitchChat({ channel, songsRef, onQueueAdd, onError }: UseTwitchChatProps) {
  const t = useTranslations('Page');

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('twitch_oauth_token');
  });

  const isMountedRef = useRef(true);
  const lastProcessedId = useRef('');
  const lastProcessedTime = useRef(0);

  // Command handler - stable reference
  const handleCommand = useCallback(
    (user: string, command: string, message: string) => {
      const cmd = command.toLowerCase();
      if (cmd !== 'addsong' && cmd !== '點歌' && cmd !== 'うた') return;

      const id = message.trim().split(/\s+/)[0]?.toUpperCase();
      if (!id) return;

      // Debounce: ignore if same ID was processed within 500ms
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
        // Send error message back to chat
        const errorMessage = t('errors.songIdNotFound', { id });
        if (comfySingleton && isComfyInitialized) {
          try {
            // @ts-expect-error Say method exists on ComfyJSInstance
            comfySingleton.Say(`@${user} ${errorMessage}`);
          } catch {
            // Silently fail if you can't send
          }
        }
        onError(errorMessage);
        setTimeout(() => onError(''), 4000);
        return;
      }

      // Send success confirmation to chat
      if (comfySingleton && isComfyInitialized) {
        try {
          const queuePosition = 0; // Will be updated by the component
          const confirmMessage = t('chat.confirmation', {
            user: user,
            id: id,
            name: entry.name,
            position: queuePosition,
          });
          // @ts-expect-error Say method exists on ComfyJSInstance
          comfySingleton.Say(`@${user} ${confirmMessage}`);
        } catch {
          // Silently fail if you can't send
        }
      }

      onQueueAdd(entry);
    },
    [songsRef, onQueueAdd, onError, t],
  );

  // Initialize ComfyJS
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
      }

      const mod = await import('comfy.js');
      const comfy = (mod?.default || mod) as ComfyJSInstance;
      if (!comfy || !isMountedRef.current) return;

      comfySingleton = comfy;

      // Check for token
      const token = localStorage.getItem('twitch_oauth_token');

      // Initialize with or without token
      if (token) {
        comfy.Init(channel, token);
        if (isMountedRef.current) {
          setIsAuthenticated(true);
        }
      } else {
        comfy.Init(channel);
        if (isMountedRef.current) {
          setIsAuthenticated(false);
        }
      }

      isComfyInitialized = true;

      // Only register command handler once
      if (!commandHandlerRegistered) {
        comfy.onCommand = handleCommand;
        commandHandlerRegistered = true;
      }

      // Connection confirmation
      if (isMountedRef.current) {
        comfy.onConnected = () => {
          const token = localStorage.getItem('twitch_oauth_token');
          if (token && comfySingleton && isComfyInitialized) {
            try {
              // @ts-expect-error Say method exists on ComfyJSInstance
              comfySingleton.Say(`🎤 ${t('chat.botConnected')}`);
            } catch {
              // no-op
            }
          }
        };
      }
    } catch (e) {
      console.error('ComfyJS init failed', e);
    }
  }, [channel, handleCommand, t]);

  // Handle OAuth token capture
  const handleOAuthRedirect = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');

      if (accessToken) {
        // Save token to localStorage
        localStorage.setItem('twitch_oauth_token', accessToken);
        setIsAuthenticated(true);

        // Clean URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.search,
        );

        // Update ComfyJS with new token
        if (comfySingleton && isComfyInitialized && channel) {
          try {
            // Clean up old connection
            if (comfySingleton.onCommand) {
              comfySingleton.onCommand = () => {};
            }
            if (comfySingleton.Disconnect) {
              comfySingleton.Disconnect();
            }
            isComfyInitialized = false;
            commandHandlerRegistered = false;

            // Reinitialize with token
            comfySingleton.Init(channel, accessToken);
            isComfyInitialized = true;
            comfySingleton.onCommand = handleCommand;
            commandHandlerRegistered = true;
          } catch (e) {
            console.error('Failed to update ComfyJS with token', e);
            // Fallback: reinitialize
            void initializeComfyJS();
          }
        }

        return true;
      }
    }
    return false;
  }, [channel, handleCommand, initializeComfyJS]);

  // Connect to Twitch OAuth
  const connectTwitch = useCallback(() => {
    const token = localStorage.getItem('twitch_oauth_token');

    if (token) {
      // Disconnect
      localStorage.removeItem('twitch_oauth_token');
      setIsAuthenticated(false);

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
  }, [channel, handleCommand, t]);

  // Reset ComfyJS connection
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
      } catch (e) {
        console.error('Failed to reset ComfyJS', e);
      }
    }
    localStorage.removeItem('twitch_oauth_token');
    setIsAuthenticated(false);
  }, []);

  // Main initialization effect
  useEffect(() => {
    isMountedRef.current = true;
    let ignore = false;

    // Handle OAuth redirect first
    const hasToken = handleOAuthRedirect();

    // Initialize ComfyJS if channel exists
    if (channel && !hasToken) {
      void initializeComfyJS();
    }

    return () => {
      isMountedRef.current = false;
      ignore = true;
      // Don't disconnect here - let the next initialization handle it
    };
  }, [channel, initializeComfyJS, handleOAuthRedirect]);

  return {
    isAuthenticated,
    connectTwitch,
    resetConnection,
    initializeComfyJS,
    setIsAuthenticated,
  };
}
