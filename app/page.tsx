"use client";

import { ComfyJSInstance } from "comfy.js";
import React, {SyntheticEvent, useEffect, useRef, useState} from "react";
import { useTranslations } from "next-intl";
import QueueTabContent from "@/components/QueueTabContent";
import SongListTabContent from "@/components/SongListTabContent";
import Header from "@/components/Header";

type SongEntry = {
  name: string;
  url: string;
};

type SongMap = Record<string, SongEntry>;

type QueueEntry = {
  id: string;
  name: string;
  url: string;
  viewer: string;
  addedAt: number;
};

export default function Home() {
  const t = useTranslations("Page");
  const [twitchChannel, setTwitchChannel] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("tk:twitchChannel") || "";
  });
  const [sheetUrl, setSheetUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("tk:sheetUrl") || "";
  });
  const [songs, setSongs] = useState<SongMap>({});
  const [error, setError] = useState("");
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"queue" | "songlist">("queue");

  const viewerRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      if (twitchChannel) localStorage.setItem("tk:twitchChannel", twitchChannel);
      if (sheetUrl) localStorage.setItem("tk:sheetUrl", sheetUrl);
    } catch (e) {
      console.error("localStorage save error", e);
    }
  }, [twitchChannel, sheetUrl]);

  useEffect(() => {
    let comfy: ComfyJSInstance | null = null;
    let connected = false;

    async function init() {
      if (!twitchChannel) return;

      try {
        const mod = await import("comfy.js");
        comfy = (mod?.default || mod) as ComfyJSInstance;
        if (!comfy) return;

        comfy.Init(twitchChannel);
        connected = true;

        comfy.onCommand = (user: string, command: string, message: string) => {
          const cmd = command.toLowerCase();
          if (cmd !== "sr" && cmd !== "request") return;

          const id = message.trim().split(/\s+/)[0]?.toUpperCase();
          if (!id) return;

          setQueue((current) => {
            const entry = buildEntryFromId(id, user);
            if (!entry) return current;
            return [...current, entry];
          });
        };
      } catch (e) {
        console.error("ComfyJS init failed", e);
      }
    }

    init().then(r => console.log("ComfyJS initialized", r));

    return () => {
      try {
        if (comfy && connected && comfy.Disconnect) comfy.Disconnect();
      } catch {
        // no-op
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twitchChannel, songs]);

  function buildEntryFromId(id: string, viewer: string): QueueEntry | null {
    const song = songs[id];
    if (!song) {
      setError(t("errors.songIdNotFound", { id }));
      setTimeout(() => setError(""), 4000);
      return null;
    }

    return {
      id,
      name: song.name,
      url: song.url,
      viewer: viewer || "viewer",
      addedAt: Date.now(),
    };
  }

  async function fetchSongs() {
    setError("");
    if (!sheetUrl) {
      setError(t("errors.noSheetUrlProvided"));
      return;
    }

    try {
      const res = await fetch(`/api/get-songs?sheetUrl=${encodeURIComponent(sheetUrl)}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({} as { error?: string }));
        setError(payload?.error || t("errors.fetchFailed", { status: res.status }));
        return;
      }

      const data = (await res.json()) as SongMap;
      setSongs(data);
    } catch (e) {
      setError(String(e));
    }
  }

  function manualAdd(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    const id = idRef.current?.value.trim().toUpperCase() || "";
    const viewer = viewerRef.current?.value.trim() || "manual";
    if (!id) {
      setError(t("errors.provideId"));
      return;
    }

    const entry = buildEntryFromId(id, viewer);
    if (entry) setQueue((current) => [...current, entry]);
  }

  function removeFromQueue(index: number) {
    setQueue((current) => current.filter((_, i) => i !== index));
  }

  function queueFromSong(id: string, name: string, url: string) {
    setQueue((current) => [
      ...current,
      { id, name, url, viewer: "manual", addedAt: Date.now() },
    ]);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100 font-sans">
      <Header />

      <div className="flex h-[calc(100vh-81px)]">
        <aside className="flex w-80 flex-col border-r border-gray-700 bg-gray-800 pt-4">
          <div className="mb-3">
            <div className="grid gap-1">
              <button
                className={`px-3 py-4 text-m ${
                  activeTab === "queue"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                }`}
                onClick={() => setActiveTab("queue")}
              >
                {t("tabs.queue")}
              </button>
              <button
                className={`px-3 py-4 text-m ${
                  activeTab === "songlist"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                }`}
                onClick={() => setActiveTab("songlist")}
              >
                {t("tabs.songlist")}
              </button>
            </div>
          </div>

          <div className="mt-auto space-y-4 p-4">
            <div className="text-xs text-gray-500">
              {t("tipPrefix")}{" "}
              <code className="rounded bg-gray-800 px-1">!sr ID</code> or{" "}
              <code className="rounded bg-gray-800 px-1">!request ID</code>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">{t("songsLoaded")}</h3>
                <div className="text-xs text-gray-400">{Object.keys(songs).length}</div>
              </div>
            </div>

            <div>
              <button
                onClick={() => setSettingsOpen((s) => !s)}
                className="w-full rounded bg-gray-700 px-3 py-2 hover:bg-gray-600"
              >
                {t("settings")}
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                {activeTab === "queue" ? t("tabs.queue") : t("tabs.songlist")}
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                {t("loadedSongsCount", { count: Object.keys(songs).length })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchSongs}
                className="rounded bg-blue-600 px-3 py-2 hover:bg-blue-500"
              >
                {t("refreshSongs")}
              </button>
            </div>
          </div>

          {error && <div className="mb-4 text-red-400">{t("errorPrefix", { error })}</div>}

          {activeTab === "queue" && (
            <QueueTabContent
              queue={queue}
              idRef={idRef}
              viewerRef={viewerRef}
              onManualAdd={manualAdd}
              onClearQueue={() => setQueue([])}
              onRemoveFromQueue={removeFromQueue}
            />
          )}

          {activeTab === "songlist" && (
            <SongListTabContent songs={songs} onQueueSong={queueFromSong} />
          )}
        </main>
      </div>

      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-gray-700 bg-gray-900 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("settings")}</h2>
              <button
                className="rounded bg-gray-700 px-2 py-1 text-sm hover:bg-gray-600"
                onClick={() => setSettingsOpen(false)}
              >
                {t("close")}
              </button>
            </div>

            <label className="mb-2 block text-sm text-gray-400">{t("settingsFields.twitchChannel")}</label>
            <input
              className="mb-2 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2"
              value={twitchChannel}
              onChange={(e) => setTwitchChannel(e.target.value)}
              placeholder={t("settingsFields.twitchChannelPlaceholder")}
            />

            <label className="mb-2 block text-sm text-gray-400">{t("settingsFields.googleSheetUrl")}</label>
            <input
              className="mb-2 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder={t("settingsFields.googleSheetUrlPlaceholder")}
            />

            <div className="flex gap-2">
              <button
                className="flex-1 rounded bg-green-600 px-3 py-2"
                onClick={() => {
                  setSettingsOpen(false);
                  fetchSongs().then(r => console.log("Songs fetched after saving settings", r));
                }}
              >
                {t("saveAndLoad")}
              </button>
              <button
                className="flex-1 rounded bg-red-600 px-3 py-2"
                onClick={() => {
                  setTwitchChannel("");
                  setSheetUrl("");
                  localStorage.removeItem("tk:twitchChannel");
                  localStorage.removeItem("tk:sheetUrl");
                }}
              >
                {t("reset")}
              </button>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              {t("settingsHelp")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
