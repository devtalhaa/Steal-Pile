'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

interface ChangeNameModalProps {
  onClose: () => void;
}

export function ChangeNameModal({ onClose }: ChangeNameModalProps) {
  const { user, setUser } = useAuthStore();
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingTime, setRemainingTime] = useState<string | null>(null);

  useEffect(() => {
    // Check cooldown on mount
    const fetchCooldown = async () => {
      if (!user) return;
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists() && docSnap.data().lastNameChange) {
          const lastChange = (docSnap.data().lastNameChange as Timestamp).toDate();
          const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
          const nextAllowedTime = new Date(lastChange.getTime() + threeDaysInMs);
          const now = new Date();

          if (now < nextAllowedTime) {
            const diffMs = nextAllowedTime.getTime() - now.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            setRemainingTime(`${diffDays} day(s) and ${diffHours} hour(s)`);
          }
        }
      } catch (e) {
        console.error("Failed to check cooldown", e);
      }
    };
    fetchCooldown();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auth.currentUser) return;
    
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('Name cannot be empty.');
      return;
    }
    if (trimmed.length > 15) {
      setError('Name must be 15 characters or less.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Update Firestore Document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        username: trimmed,
        lastNameChange: serverTimestamp()
      });

      // 2. Update Auth Profile
      await updateProfile(auth.currentUser, { displayName: trimmed });

      // 3. Update Auth Store locally to reflect changes immediately
      setUser({
        ...user,
        displayName: trimmed
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update name');
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-yellow-600/30 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          ✖
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-4">Change Name</h2>
        
        {remainingTime ? (
          <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 p-4 rounded-xl text-center">
            <p className="mb-2">⚠️ You are on cooldown.</p>
            <p className="text-sm text-gray-300">
              You can change your name again in:<br/>
              <span className="font-bold text-yellow-500">{remainingTime}</span>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-gray-400 mb-2">
              Warning: You can only change your name once every 3 days. Choose wisely!
            </p>

            <div>
              <input 
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-600 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
                placeholder={user.displayName || 'New Name'}
                maxLength={15}
              />
            </div>

            {error && <div className="text-red-400 text-sm">{error}</div>}

            <button 
              type="submit" 
              disabled={loading || !newName.trim()}
              className="w-full mt-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-yellow-500/20 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Confirm Name Change'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
