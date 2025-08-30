import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StudentDashboard from './components/StudentDashboard';
import AdminPanel from './components/AdminPanel';
import LiveClassPlayer from './components/LiveClassPlayer';
import AdminLogin from './components/AdminLogin';
import { supabase } from './supabaseClient';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-[var(--glass-border)] border-t-[var(--text-primary)] rounded-full animate-spin"></div>
      </div>
    );
  }

  const isAdminAuthenticated = !!session;

  return (
    <Router>
      <main className="relative z-10">
        <Routes>
          <Route 
            path="/" 
            element={<StudentDashboard />} 
          />
          <Route 
            path="/admin-login" 
            element={!isAdminAuthenticated ? <AdminLogin /> : <Navigate to="/admin" replace />} 
          />
          <Route 
            path="/admin" 
            element={
              isAdminAuthenticated ? 
              <AdminPanel /> : 
              <Navigate to="/admin-login" replace />
            } 
          />
          <Route 
            path="/live/:classId" 
            element={<LiveClassPlayer />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
