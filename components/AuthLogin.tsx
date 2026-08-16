import React, { FormEvent, useState } from 'react';
import { signInWithEmail } from '../src/lib/firebaseAuth';

interface AuthLoginProps {
  onAuthenticated?: () => void;
}

export default function AuthLogin({ onAuthenticated }: AuthLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Informe seu e-mail e senha.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email, password);
      onAuthenticated?.();
    } catch (err: any) {
      const code = err?.code;
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setError('E-mail ou senha inválidos.');
      } else if (code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
      } else {
        setError('Não foi possível entrar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-5">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Entrar no Clinicar</h1>
          <p className="text-sm text-slate-500 mt-1">Acesse sua conta com segurança.</p>
        </div>

        {error && (
          <div role="alert" className="rounded-xl bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 text-sm font-medium">
            {error}
          </div>
        )}

        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">E-mail</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Senha</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-cyan-600 text-white py-3 font-bold hover:bg-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
