'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // If already logged in
    if (sessionStorage.getItem('admin_authenticated') === 'true') {
      router.push('/secret/admin');
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@talha.com' && pass === 'talhabutt77') {
      sessionStorage.setItem('admin_authenticated', 'true');
      router.push('/secret/admin');
    } else {
      setError('Unauthorized credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-500/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-block p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 mb-4">
            <span className="text-4xl">🔐</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Admin <span className="text-yellow-500">Access</span></h1>
          <p className="text-gray-500 text-sm mt-2 uppercase tracking-widest font-bold">Authorized Personnel Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Credentials Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-yellow-500/50 transition-all"
              placeholder="admin@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Access Password</label>
            <input 
              type="password" 
              required
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-yellow-500/50 transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-500 py-3 px-4 rounded-xl text-xs font-bold text-center uppercase tracking-wider"
            >
              {error}
            </motion.div>
          )}

          <button 
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(234,179,8,0.2)] transition-all active:scale-[0.98]"
          >
            Authenticate
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-gray-400 text-[10px] uppercase tracking-widest font-bold transition-colors"
          >
            ← Return to Game
          </button>
        </div>
      </motion.div>
    </div>
  );
}
