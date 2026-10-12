import { createContext, useContext, useState, ReactNode } from 'react';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readStoredSession(): { user: User | null; token: string | null } {
  const token = localStorage.getItem('access_token');
  const user = localStorage.getItem('user');
  try {
    if (token && user) return { token, user: JSON.parse(user) };
  } catch {
    // Datos guardados ilegibles: se empieza sin sesión
  }
  return { token: null, user: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // La sesión guardada se lee al crear el estado: así la primera pintura ya sabe quién hay
  const [session, setSession] = useState(readStoredSession);
  const { user, token } = session;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const startSession = ({ access_token, user: userData }: AuthResponse) => {
    // Lo que quedara en memoria es de quien usó antes este navegador
    queryClient.clear();
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setSession({ token: access_token, user: userData });
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
    setSession({ token: null, user: null });
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, devLogin, logout }}>
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
