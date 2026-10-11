import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 w-full container-main py-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 w-full container-main py-12">
        {children}
      </main>
      <footer className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="container-main text-center text-sm text-gray-500">
          <p>Préstamos Familia - Comparador de financiación</p>
        </div>
      </footer>
    </div>
  );
}
