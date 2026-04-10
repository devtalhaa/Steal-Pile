'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, onSnapshot, getDoc } from 'firebase/firestore';
import { useSocket } from '@/hooks/useSocket';

interface FriendData {
  uid: string;
  username: string;
  shortId: string;
}

export function FriendsList() {
  const { user } = useAuthStore();
  const socket = useSocket();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  
  const [searchId, setSearchId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // 1. Fetch current user's friends list
  useEffect(() => {
    if (!user?.uid) return;

    // Listen to our own user document to get the friends array updates
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const friendUids: string[] = docSnap.data().friends || [];
        
        // Fetch details for each friend
        const friendDetails: FriendData[] = [];
        for (const fUid of friendUids) {
          const fDoc = await getDoc(doc(db, 'users', fUid));
          if (fDoc.exists()) {
            friendDetails.push({ 
              uid: fUid, 
              username: fDoc.data().username, 
              shortId: fDoc.data().shortId 
            });
          }
        }
        setFriends(friendDetails);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // 2. Listen to Socket events for online status
  useEffect(() => {
    if (!socket) return;
    
    // We expect the server to send us a list of online user IDs
    socket.on('presence:online-users', (users: string[]) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off('presence:online-users');
    };
  }, [socket]);

  const handleAddFriend = async () => {
    if (!user) return;
    const term = searchId.trim();
    if (!term.startsWith('#') || term.length !== 7) {
      setError('Please enter a valid ID (e.g. #123456)');
      return;
    }
    
    // Prevent adding yourself
    if (term === user.shortId) {
      setError("You cannot add yourself.");
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const q = query(collection(db, 'users'), where('shortId', '==', term));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('No player found with that ID.');
      } else {
        const foundUser = querySnapshot.docs[0];
        const newFriendUid = foundUser.id;
        
        // Check if already friends
        if (friends.some(f => f.uid === newFriendUid)) {
          setError('Already friends with this player!');
        } else {
          // Add to our own document's friends array
          await updateDoc(doc(db, 'users', user.uid), {
            friends: arrayUnion(newFriendUid)
          });
          setSuccess(`Added ${foundUser.data().username}!`);
          setSearchId('');
        }
      }
    } catch (e: any) {
      setError('Failed to add friend.');
    } finally {
      setLoading(false);
    }
  };

  const inviteFriend = (friendUid: string) => {
    if (!socket) return;
    socket.emit('game:invite', { targetUid: friendUid, fromName: user?.displayName });
    // In a full implementation we might show a "Sent!" toast here
  };

  if (!user) return null; // Shouldn't render if not logged in

  return (
    <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-5 mb-6 backdrop-blur-sm">
      <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
        <span>👥</span> Your Friends
      </h3>

      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          placeholder="Enter ID (#123456)" 
          className="flex-1 bg-gray-900/50 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
        />
        <button 
          onClick={handleAddFriend}
          disabled={loading || !searchId}
          className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {loading ? '...' : 'Add'}
        </button>
      </div>
      
      {error && <div className="text-red-400 text-xs mb-3 font-semibold">{error}</div>}
      {success && <div className="text-green-400 text-xs mb-3 font-semibold">{success}</div>}

      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
        {friends.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-4">
            No friends yet. Add someone using their ID!
          </div>
        ) : (
          friends.map(friend => {
            const isOnline = onlineUsers.includes(friend.uid);
            
            return (
              <div key={friend.uid} className="flex items-center justify-between bg-gray-900/40 rounded-lg py-2 px-3 border border-gray-700/30">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-600'}`}></div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-200">{friend.username}</span>
                    <span className="text-[10px] text-gray-500">{friend.shortId}</span>
                  </div>
                </div>
                
                <button 
                  disabled={!isOnline}
                  onClick={() => inviteFriend(friend.uid)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all ${
                    isOnline 
                      ? 'bg-yellow-600/20 text-yellow-500 hover:bg-yellow-500 hover:text-black border border-yellow-600/30' 
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {isOnline ? 'Invite' : 'Offline'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
