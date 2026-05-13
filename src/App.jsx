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
  const isAdmin = ['admin', 'supervisor', 'jefe'].includes(profile.role);

  return (
    <BrowserRouter>
      <Routes>
        
        {/* === RUTAS ADMINISTRADOR === */}
        {isAdmin ? (
           <>
             <Route path="/" element={<Navigate to="/dashboard" replace />} />
             <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
             <Route path="/store-detail" element={<AppLayout><StoreDetail /></AppLayout>} />
             <Route path="/users" element={<AppLayout><UsersManagement /></AppLayout>} />
             <Route path="/challenges" element={<AppLayout><ChallengesManagement /></AppLayout>} />
             <Route path="/simulations" element={<AppLayout><SimulationsManagement /></AppLayout>} />
             <Route path="/roles" element={<AppLayout><RolesConfig /></AppLayout>} />
             <Route path="/app/*" element={<Navigate to="/dashboard" replace />} />
           </>
        ) : (
           /* === RUTAS EMPLEADO TIPO ASESOR === */
           <>
             <Route path="/" element={<Navigate to="/app/home" replace />} />
             <Route path="/app" element={<MobileLayout />}>
                 <Route path="home" element={<MobileHome />} />
                 <Route path="simulator" element={<MobileSimulator />} />
                 <Route path="quiz" element={<MobileQuiz />} />
                 <Route path="profile" element={<MobileProfile />} />
             </Route>
             <Route path="*" element={<Navigate to="/app/home" replace />} />
           </>
        )}
        
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
