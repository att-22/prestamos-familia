import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, type AuthResponse, type RegisterData } from '@/services/api';
import type { User } from '@/types/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  /** Solo en desarrollo: entra como un usuario de demostración sin contraseña. */
  devLogin: (email: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Restaurar sesión del localStorage
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const startSession = ({ access_token, user: userData }: AuthResponse) => {
    // Lo que quedara en memoria es de quien usó antes este navegador
    queryClient.clear();
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    navigate('/dashboard');
  };

  const login = async (email: string, password: string) => {
    startSession((await authApi.login(email, password)).data);
  };

  const register = async (data: RegisterData) => {
    startSession((await authApi.register(data)).data);
  };

  const devLogin = async (email: string) => {
    startSession((await authApi.devToken(email)).data);
  };

  const logout = () => {
    queryClient.clear();
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, devLogin, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
