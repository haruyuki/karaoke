'use client';

import React from 'react';
import { MicVocal } from 'lucide-react';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { useTranslations } from 'next-intl';

export default function Header() {
  const t = useTranslations('Header');

  return (
    <header className="border-b border-slate-700 bg-slate-900 shadow-sm backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 md:py-3 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="rounded-xl bg-linear-to-br from-purple-600 to-purple-800 p-3 shadow-lg">
              <MicVocal className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
            </div>
          </div>

          <div className="flex items-center">
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
