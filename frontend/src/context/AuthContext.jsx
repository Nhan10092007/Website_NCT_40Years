import { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('nct40_token')));

  useEffect(() => {
    if (!localStorage.getItem('nct40_token')) {
      return;
    }
    client.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem('nct40_token'))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(credentials) {
      const { data } = await client.post('/auth/login', credentials);
      localStorage.setItem('nct40_token', data.token);
      setUser(data.user);
      return data.user;
    },
    async register(values) {
      const { data } = await client.post('/auth/register', values);
      localStorage.setItem('nct40_token', data.token);
      setUser(data.user);
      return data.user;
    },
    logout() {
      localStorage.removeItem('nct40_token');
      setUser(null);
    },
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}