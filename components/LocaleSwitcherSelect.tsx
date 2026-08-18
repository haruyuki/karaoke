'use client';

import { Check, Languages } from 'lucide-react';
import { useTransition, useState } from 'react';
import { Locale } from '@/i18n/config';
import { setUserLocale } from '@/services/locale';

type Props = {
  defaultValue: string;
  items: Array<{ value: string; label: string }>;
  label: string;
};

export default function LocaleSwitcherSelect({ defaultValue, items, label }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(defaultValue);

  function onChange(value: string) {
    const locale = value as Locale;
    setSelectedValue(value);
    setIsOpen(false);
    startTransition(() => {
      setUserLocale(locale)
        .then((r) => console.log('Locale set:', r))
        .catch((e) => console.error('Error setting locale:', e));
    });
  }

  const triggerClasses = `
        rounded-xl p-2 transition-colors hover:bg-slate-700 relative cursor-pointer
        ${isPending ? 'pointer-events-none opacity-60' : ''}
    `.trim();

  return (
    <div
      className="relative"
      onBlur={(e) => {
        // Only close if the new focus target is not within this component
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        aria-label={label}
        className={triggerClasses}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <Languages className="h-6 w-6 text-slate-300 transition-colors hover:text-white" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 z-50 min-w-32 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 py-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item.value}
              className="flex w-full cursor-pointer items-center px-3 py-2 text-left text-base transition-colors hover:bg-slate-700"
              onClick={() => onChange(item.value)}
              type="button"
            >
              <div className="mr-2 w-4">
                {item.value === selectedValue && <Check className="h-5 w-5 text-blue-400" />}
              </div>
              <span className="text-slate-200">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
