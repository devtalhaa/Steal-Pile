'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const [isLogginIn, setIsLogginIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { user, setUser } = useAuthStore();

  useEffect(() => {
    // If AuthProvider already populated the user, redirect immediately
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // Generate a random 6-digit shortId
  const generateShortId = () => '#' + Math.floor(100000 + Math.random() * 900000).toString();

  useEffect(() => {
    // If AuthProvider already populated the user, redirect immediately
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      if (result.user) {
        const user = result.user;
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        
        let shortId = '';
        if (!docSnap.exists()) {
          shortId = generateShortId();
          await setDoc(userDocRef, {
            username: user.displayName || 'Player',
            email: user.email,
            friends: [],
            shortId
          });
        } else {
          shortId = docSnap.data().shortId;
        }

        setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Player',
          shortId
        });

        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete Google login');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLogginIn && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!isLogginIn && !username.trim()) {
      setError('Please provide a username.');
      return;
    }

    setLoading(true);

    try {
      if (isLogginIn) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const docSnap = await getDoc(doc(db, 'users', result.user.uid));
        
        setUser({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || (docSnap.exists() ? docSnap.data().username : 'Player'),
          shortId: docSnap.exists() ? docSnap.data().shortId : null
        });
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: username });
        
        const shortId = generateShortId();
        await setDoc(doc(db, 'users', result.user.uid), {
          username: username.trim(),
          email: result.user.email,
          friends: [],
          shortId
        });

        setUser({
          uid: result.user.uid,
          email: result.user.email,
          displayName: username.trim(),
          shortId
        });
      }
      
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="mb-8 text-center">
        <div className="text-6xl mb-2">🃏</div>
        <h1 className="text-3xl font-bold text-white tracking-widest textShadow">KHOTI</h1>
      </div>

      <div className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <h2 className="text-2xl text-white font-bold mb-6 text-center">
          {isLogginIn ? 'Welcome Back' : 'Create Account'}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
          {!isLogginIn && (
            <div>
              <label className="text-xs text-gray-400 font-bold uppercase ml-1">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full mt-1 bg-gray-900/50 border border-gray-600 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
                placeholder="CoolPlayer"
                required={!isLogginIn}
              />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 font-bold uppercase ml-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 bg-gray-900/50 border border-gray-600 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
              placeholder="you@email.com"
              required
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 font-bold uppercase ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 bg-gray-900/50 border border-gray-600 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
              placeholder={isLogginIn ? "Your password" : "Min. 6 characters"}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black font-bold py-3.5 rounded-xl shadow-lg hover:shadow-yellow-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogginIn ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-700"></div>
          <span className="px-3 text-sm text-gray-500 font-semibold">OR</span>
          <div className="flex-1 border-t border-gray-700"></div>
        </div>

        <button 
          onClick={handleGoogle}
          disabled={loading}
          className="w-full bg-white text-gray-900 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50 hover:bg-gray-100"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="mt-8 text-center text-sm text-gray-400">
          {isLogginIn ? "Don't have an account?" : "Already have an account?"}
          <button 
            onClick={() => { setIsLogginIn(!isLogginIn); setError(null); }}
            className="ml-2 text-yellow-500 font-bold hover:underline"
          >
            {isLogginIn ? "Sign up" : "Login"}
          </button>
        </p>

        <div className="mt-6 text-center">
          <button 
            onClick={() => router.push('/')}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            ← Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
