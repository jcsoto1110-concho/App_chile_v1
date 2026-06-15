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
                const { data } = await supabase.from('profiles').select('*, stores(name), brands(*)').eq('id', customProfile.id).single();
                if (data) {
                    if (data.brands?.primary_color) {
                       document.documentElement.style.setProperty('--accent-primary', data.brands.primary_color);
                       document.documentElement.style.setProperty('--accent-secondary', data.brands.primary_color);
                    }
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
      const { data } = await supabase.from('profiles').select('*, stores(name), brands(*)').eq('id', userSession.user.id).single();
      
      const adminEmails = ['admin@marathon.cl', 'jcsoto@gmail.com'];
      const isPrivileged = adminEmails.includes(userSession.user.email.toLowerCase());

      if (data) {
          // Auto-Corrección para administradores que entraron por primera vez y se guardaron como asesores
          if (isPrivileged && data.role !== 'admin') {
              data.role = 'admin';
              await supabase.from('profiles').update({ role: 'admin' }).eq('id', data.id);
          }
          if (data.brands?.primary_color) {
             document.documentElement.style.setProperty('--accent-primary', data.brands.primary_color);
             document.documentElement.style.setProperty('--accent-secondary', data.brands.primary_color);
          }
          setProfile(data);
      } else {
          // Fallback para asegurarnos que todos los que entren por Auth backend tengan perfil
          const fakeProfile = {
             id: userSession.user.id,
             email: userSession.user.email,
             full_name: isPrivileged ? 'Administrador Maestro' : 'Empleado ' + userSession.user.email.split('@')[0],
             role: isPrivileged ? 'admin' : 'asesor',
             current_level: 1,
             current_xp: 0,
             fitcoins: 0,
             classification: 'Challenger'
          };
          // Insertamos silenciamente el fallback
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

  const superAdminEmails = ['admin@marathon.cl', 'jcsoto@gmail.com'];
  const isSuperAdmin = profile ? superAdminEmails.includes(profile.email.toLowerCase()) : false;

  const refreshProfile = async () => {
    const currentUserId = session?.user?.id || profile?.id;
    if (currentUserId) {
      try {
        const { data } = await supabase.from('profiles').select('*, stores(name), brands(*)').eq('id', currentUserId).single();
        if (data) {
          if (data.brands?.primary_color) {
             document.documentElement.style.setProperty('--accent-primary', data.brands.primary_color);
             document.documentElement.style.setProperty('--accent-secondary', data.brands.primary_color);
          }
          setProfile(data);
        }
      } catch (e) {
        console.error("Error refreshing profile", e);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, isSuperAdmin, refreshProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
