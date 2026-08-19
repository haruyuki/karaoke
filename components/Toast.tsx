import React from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

const toastStyles = {
  success: {
    borderColor: 'border-emerald-500',
    iconBg: 'bg-emerald-500',
    icon: (
      <svg
        className="h-3.5 w-3.5 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    borderColor: 'border-rose-500',
    iconBg: 'bg-rose-500',
    icon: (
      <svg
        className="h-3.5 w-3.5 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  warning: {
    borderColor: 'border-amber-500',
    iconBg: 'bg-amber-500',
    icon: <span className="font-mono text-xs font-bold text-white">!</span>,
  },
  info: {
    borderColor: 'border-blue-500',
    iconBg: 'bg-blue-500',
    icon: <span className="font-serif text-xs font-bold text-white italic">i</span>,
  },
};

export function Toast({ message, type = 'error', onClose }: ToastProps) {
  const style = toastStyles[type] || toastStyles.error;

  return (
    <div
      className={`animate-in slide-in-from-right-5 fade-in flex max-w-md min-w-[320px] items-center justify-between rounded-xl border-b-4 bg-[#3B3E4A] px-4 py-3.5 text-white shadow-xl duration-300 ${style.borderColor}`}
    >
      {/* Icon & Message Container */}
      <div className="flex items-center gap-3 pr-4">
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${style.iconBg}`}
        >
          {style.icon}
        </div>
        <span className="text-sm font-medium text-slate-100">{message}</span>
      </div>

      {/* Action Button & Divider */}
      <div className="flex items-center border-l border-slate-600/60 pl-4">
        <button
          onClick={onClose}
          className="text-sm font-semibold text-slate-200 transition-colors hover:text-white focus:outline-none"
        >
          Close
        </button>
      </div>
    </div>
  );
}
