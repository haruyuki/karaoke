import React, { RefObject, SyntheticEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Play, X } from 'lucide-react';

type QueueEntry = {
  id: string;
  name: string;
  url: string;
  viewer: string;
  addedAt: number;
};

type Props = {
  queue: QueueEntry[];
  idRef: RefObject<HTMLInputElement | null>;
  viewerRef: RefObject<HTMLInputElement | null>;
  onManualAdd: (e: SyntheticEvent<HTMLFormElement>) => void;
  onClearQueue: () => void;
  onRemoveFromQueue: (index: number) => void;
};

export default function QueueTabContent({
  queue,
  idRef,
  viewerRef,
  onManualAdd,
  onClearQueue,
  onRemoveFromQueue,
}: Props) {
  const t = useTranslations('QueueTab');

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        <button onClick={onClearQueue} className="rounded bg-red-600 px-3 py-1 text-sm">
          {t('clearQueue')}
        </button>
      </div>

      <form onSubmit={onManualAdd} className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <input
          ref={idRef}
          placeholder={t('idPlaceholder')}
          className="rounded border border-gray-700 bg-gray-800 px-3 py-2"
        />
        <input
          ref={viewerRef}
          placeholder={t('viewerPlaceholder')}
          className="rounded border border-gray-700 bg-gray-800 px-3 py-2"
        />
        <button className="rounded bg-green-600 px-3 py-2">{t('addToQueue')}</button>
      </form>

      {queue.length === 0 && <div className="text-gray-500">{t('queueEmpty')}</div>}
      <ul className="space-y-2">
        {queue.map((q, i) => (
          <li
            key={q.addedAt + i}
            className="flex items-center justify-between rounded bg-gray-800 p-3"
          >
            <div>
              <div className="text-sm text-gray-200">
                #{i + 1} {q.id} - {q.name}
              </div>
              <div className="text-xs text-gray-500">{t('requestedBy', { viewer: q.viewer })}</div>
            </div>
            <div className="flex items-center gap-2">
              <a
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-500"
                href={q.url}
                target="_blank"
                rel="noreferrer"
                aria-label={t('openLink')}
                title={t('openLink')}
              >
                <Play className="h-4 w-4 fill-current" />
              </a>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500"
                onClick={() => onRemoveFromQueue(i)}
                aria-label={t('remove')}
                title={t('remove')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
