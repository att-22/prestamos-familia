import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="print:hidden"><Header /></div>
      <main className="flex-1 w-full container-main py-6 print:max-w-none print:p-0">
        <Outlet />
      </main>
      <div className="print:hidden"><Footer /></div>
    </div>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 w-full container-main py-12 print:max-w-none print:p-0">
        {children}
      </main>
      <footer className="bg-gray-50 border-t border-gray-200 py-8 print:hidden">
        <div className="container-main text-center text-sm text-gray-500">
          <p>Préstamos Familia - Comparador de financiación</p>
        </div>
      </footer>
    </div>
  );
}
