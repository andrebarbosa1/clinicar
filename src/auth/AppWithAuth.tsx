import React from 'react';
import App from '../../App.tsx';
import { AuthProvider, useAuth } from './AuthProvider';
import FirebaseLogin from './FirebaseLogin';

function AuthenticatedApp() {
  const { loading, user, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
          <p className="text-sm text-slate-600">Carregando sessão...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <FirebaseLogin />;
  }

  return <App />;
}

export default function AppWithAuth() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
