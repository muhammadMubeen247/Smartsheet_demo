import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth.store';

export function Dashboard() {
  const { user } = useAuthStore();
  const fullText = `Hi ${user?.name ?? ''}! Nice to meet you`;
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let index = 0;

    const interval = setInterval(() => {
      setDisplayedText(fullText.slice(0, index + 1));
      index++;

      if (index === fullText.length) {
        clearInterval(interval);
      }
    }, 70);

    return () => clearInterval(interval);
  }, [fullText]);

  return (
    <section className="mx-auto flex min-h-[calc(100vh-140px)] max-w-5xl items-center justify-center">
      <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-900/[0.03]">
        <div className="h-1.5 bg-gradient-to-r from-red-600 via-red-500 to-rose-300" />
        <div className="px-6 py-12 text-center sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            {displayedText}
            <span className="animate-pulse text-red-600">|</span>
          </h2>
        </div>
      </div>
    </section>
  );
}
