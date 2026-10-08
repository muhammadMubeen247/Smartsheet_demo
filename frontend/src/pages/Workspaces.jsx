import { BriefcaseBusiness } from 'lucide-react';

export function Workspaces() {
  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm shadow-zinc-900/[0.03]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <BriefcaseBusiness className="h-6 w-6" />
        </div>
        <p className="mt-5 text-sm font-medium text-zinc-600">Workspaces page - coming soon</p>
      </div>
    </section>
  );
}
