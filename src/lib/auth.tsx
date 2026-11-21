import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';
import type {Session} from '@supabase/supabase-js';
import {supabase, type Profile} from './supabase';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  isLoading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({children}: {children: ReactNode}) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      return;
    }
    const {data} = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => {
      setSession(data.session);
      setIsLoading(false);
      void loadProfile(data.session);
    });
    const {data: sub} = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Run outside the auth callback to avoid Supabase client deadlocks.
      setTimeout(() => void loadProfile(s), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{session, profile, isLoading, refreshProfile: () => loadProfile(session)}}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
