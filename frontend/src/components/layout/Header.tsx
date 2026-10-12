import { Link, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Menu, X, LogOut, User, Wallet, ShoppingBag, Calculator, BookOpen, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export function Header() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Mis compras', icon: ShoppingBag },
    { path: '/comparisons', label: 'Mis comparativas', icon: Calculator },
    { path: '/glossary', label: 'Glosario', icon: BookOpen },
    ...(user?.is_admin ? [{ path: '/admin', label: 'Administración', icon: ShieldCheck }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <nav className="container-main" aria-label="Navegación principal">
        <div className="flex h-16 items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-xl font-bold text-primary-600">
            <Wallet className="h-6 w-6" />
            <span>Préstamos Familia</span>
          </Link>

          <div className="hidden md:flex md:items-center md:gap-6">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    isActive ? 'text-primary-600' : 'text-gray-600 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
            
            {user && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">{user.name || user.email}</span>
                <Button variant="outline" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-1" />
                  Salir
                </Button>
              </div>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden py-4 border-t border-gray-200 animate-slide-down">
            <div className="flex flex-col gap-2">
              {navItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              ))}
              {user && (
                <div className="pt-2 border-t border-gray-200 flex items-center gap-3 px-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600 flex-1">{user.name || user.email}</span>
                  <Button variant="outline" size="sm" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                    <LogOut className="h-4 w-4 mr-1" />
                    Salir
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
