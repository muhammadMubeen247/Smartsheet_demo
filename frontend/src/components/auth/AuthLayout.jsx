import { Grid2X2 } from 'lucide-react';

export function AuthLayout({ children, title, description }) {
  return (
    <main className="auth-screen flex min-h-screen flex-col bg-white lg:flex-row">
      <section className="auth-aside relative flex min-h-[360px] flex-col justify-between overflow-hidden bg-zinc-950 px-8 py-9 text-white sm:px-12 sm:py-11 lg:min-h-screen lg:w-1/2 lg:px-16 lg:py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(140,17,29,0.42),_transparent_58%)]" />
        <div className="pointer-events-none absolute -right-24 top-[25%] h-80 w-80 rounded-full border-[24px] border-red-950/45" />
        <div className="pointer-events-none absolute -right-8 top-[30%] h-48 w-48 rounded-full border-[20px] border-red-950/35" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/5">
            <Grid2X2 className="h-5 w-5 text-red-400" />
          </span>
          <span className="text-sm font-semibold tracking-wide text-white/90">Smartsheet Demo</span>
        </div>

        <div aria-hidden="true" className="relative z-10 flex flex-1 items-center justify-center py-12 lg:py-0">
          <div className="relative flex h-56 w-56 items-center justify-center rounded-full border border-red-900/50 bg-red-950/20">
            <div className="absolute h-44 w-44 rounded-full border border-red-900/50" />
            <div className="absolute h-32 w-32 rounded-full border border-red-900/50 bg-red-950/20" />
            <Grid2X2 className="relative h-9 w-9 text-red-300/80" />
          </div>
        </div>
      </section>

      <section className="flex min-h-[560px] items-center justify-center px-6 py-12 sm:px-10 lg:min-h-screen lg:w-1/2 lg:px-12">
        <div className="w-full max-w-[420px]">
          <header className="mb-8">
            <h2 className="text-[30px] font-semibold tracking-tight text-zinc-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
          </header>
          <div className="auth-form-panel">{children}</div>
        </div>
      </section>
    </main>
  );
}
