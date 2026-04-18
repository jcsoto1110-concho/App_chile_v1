import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function syncProfile(userSession) {
      if (!userSession) {
         // PARCHE DE AUTENTICACION HÍBRIDA (Custom Local Session)
         const customSessionRaw = localStorage.getItem('custom_session');
         if (customSessionRaw) {
             try {
                const customProfile = JSON.parse(customSessionRaw);
                // Extraer de DB fresca
                const { data } = await supabase.from('profiles').select('*, stores(name)').eq('id', customProfile.id).single();
                if (data) {
                    setProfile(data);
                    // Engañar al engine inyectando sesión simulada
                    setSession({ user: { id: data.id } });
                    setLoading(false);
                    return;
                }
             } catch (e) {
                console.error("Error leyendo custom_session local", e);
             }
         }

         setProfile(null);
         setSession(null);
         setLoading(false);
         return;
      }

      // Buscar si el usuario ya tiene su perfil amarrado
      const { data } = await supabase.from('profiles').select('*, stores(name)').eq('id', userSession.user.id).single();
      
      if (data) {
          setProfile(data);
      } else {
          // Fallback para asegurarnos que todos los que entren por Auth backend tengan perfil de prueba
          const fakeProfile = {
             id: userSession.user.id,
             email: userSession.user.email,
             full_name: 'Empleado ' + userSession.user.email.split('@')[0],
             role: 'asesor',
             current_level: 1,
             current_xp: 0,
             fitcoins: 0
          };
          // Insertamos silenciamente el fallback si fue creado por backend y se le olvidó insertar a public.profiles
          await supabase.from('profiles').insert([fakeProfile]);
          setProfile(fakeProfile);
      }
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      syncProfile(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(true);
      syncProfile(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
