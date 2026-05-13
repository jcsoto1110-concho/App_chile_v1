import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MobileLayout from './components/MobileLayout';

import Dashboard from './pages/Dashboard';
import StoreDetail from './pages/StoreDetail';
import UsersManagement from './pages/UsersManagement';
import ChallengesManagement from './pages/ChallengesManagement';
import SimulationsManagement from './pages/SimulationsManagement';
import RolesConfig from './pages/RolesConfig';
import Login from './pages/Login';

import MobileHome from './pages/mobile/MobileHome';
import MobileSimulator from './pages/mobile/MobileSimulator';
import MobileProfile from './pages/mobile/MobileProfile';
import MobileQuiz from './pages/mobile/MobileQuiz';
import MobileTeam from './pages/mobile/MobileTeam';
import { AuthProvider, useAuth } from './lib/AuthContext';

// Layout Auxiliar para envolver el backoffice existente
function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
         <React.Suspense fallback={<div className="animate-fade-in text-muted">Cargando módulo...</div>}>
            {children}
         </React.Suspense>
      </main>
    </div>
  );
}

// Router Principal Protegido
function RouterLogic() {
  const { session, profile } = useAuth();

  if (!session || !profile) {
    return (
       <React.Suspense fallback={<div />}>
          <Login />
       </React.Suspense>
    );
  }

  // Enrutamiento Inteligente Basado en Rol.
  const isAdmin = ['admin', 'supervisor', 'jefe', 'jefe_de_tienda'].includes(profile.role?.toLowerCase());

  return (
    <BrowserRouter>
      <Routes>
        
        {/* RUTAS COMPARTIDAS / DINÁMICAS */}
        <Route path="/" element={['admin', 'supervisor'].includes(profile.role?.toLowerCase()) ? <Navigate to="/dashboard" replace /> : <Navigate to="/app/home" replace />} />

        {/* === RUTAS ADMINISTRATIVAS === */}
        {isAdmin && (
           <>
             <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
             <Route path="/store-detail" element={<AppLayout><StoreDetail /></AppLayout>} />
             <Route path="/users" element={<AppLayout><UsersManagement /></AppLayout>} />
             <Route path="/challenges" element={<AppLayout><ChallengesManagement /></AppLayout>} />
             <Route path="/simulations" element={<AppLayout><SimulationsManagement /></AppLayout>} />
             <Route path="/roles" element={<AppLayout><RolesConfig /></AppLayout>} />
           </>
        )}

        {/* === RUTAS MÓVILES (ACCESIBLES PARA TODOS) === */}
        <Route path="/app" element={<MobileLayout />}>
            <Route path="home" element={<MobileHome />} />
            <Route path="simulator" element={<MobileSimulator />} />
            <Route path="quiz" element={<MobileQuiz />} />
            <Route path="profile" element={<MobileProfile />} />
            <Route path="team" element={<MobileTeam />} />
        </Route>

        <Route path="*" element={isAdmin ? <Navigate to="/dashboard" replace /> : <Navigate to="/app/home" replace />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
     <AuthProvider>
        <RouterLogic />
     </AuthProvider>
  );
}
