import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-zinc-100">
      <Sidebar />
      <Header />
      <main className="app-main min-h-screen px-5 pb-8 pt-[94px] sm:px-7 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
