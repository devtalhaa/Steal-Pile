import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export function WelcomeDialog() {
  const router = useRouter();
  const setGuest = useAuthStore((s) => s.setGuest);

  const handleGuest = () => {
    // Just mark as guest, they will type their name in the main lobby menu
    setGuest('');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-yellow-600/30 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
        <div className="text-5xl mb-4">🃏</div>
        <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">Welcome to Khoti</h2>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          Log in to add friends and invite them instantly, or continue as a guest to join via code.
        </p>

        <button
          onClick={handleLogin}
          className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold py-3.5 px-6 rounded-xl mb-4 transition-all shadow-lg hover:shadow-yellow-500/20 active:scale-95"
        >
          Login / Sign Up
        </button>

        <button
          onClick={handleGuest}
          className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3.5 px-6 rounded-xl transition-all border border-gray-700 hover:border-gray-600 active:scale-95"
        >
          Continue as Guest
        </button>
      </div>
    </div>
  );
}
