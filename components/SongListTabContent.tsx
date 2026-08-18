import React from "react";
import { useTranslations } from "next-intl";

type SongEntry = {
  name: string;
  url: string;
};

type SongMap = Record<string, SongEntry>;

type Props = {
  songs: SongMap;
  onQueueSong: (id: string, name: string, url: string) => void;
};

export default function SongListTabContent({ songs, onQueueSong }: Props) {
  const t = useTranslations("SongListTab");
  const entries = Object.entries(songs).slice(0, 200);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{t("title")}</h2>
      {entries.length === 0 && <div className="text-gray-500">{t("noSongsLoaded")}</div>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {entries.map(([id, s]) => (
          <div key={id} className="flex items-center justify-between rounded bg-gray-800 p-3">
            <div>
              <div className="font-medium">
                {id} - {s.name}
              </div>
              <div className="max-w-lg truncate text-xs text-gray-400">{s.url}</div>
            </div>
            <div className="flex flex-col gap-2">
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="rounded bg-blue-600 px-3 py-1 text-sm"
              >
                {t("open")}
              </a>
              <button
                onClick={() => onQueueSong(id, s.name, s.url)}
                className="rounded bg-green-600 px-3 py-1 text-sm"
              >
                {t("queue")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
