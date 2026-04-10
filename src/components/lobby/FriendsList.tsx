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
  const [incomingRequests, setIncomingRequests] = useState<FriendData[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendData[]>([]);
  const [outgoingUids, setOutgoingUids] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  
  const [searchId, setSearchId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [invitedUids, setInvitedUids] = useState<Set<string>>(new Set());

  // 1. Fetch current user's friends and requests
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const friendUids: string[] = userData.friends || [];
        const incomingUids: string[] = userData.incomingRequests || [];
        const outgoing: string[] = userData.outgoingRequests || [];
        
        setOutgoingUids(outgoing);

        // Fetch details helper
        const fetchDetails = async (uids: string[]) => {
          const details: FriendData[] = [];
          for (const uid of uids) {
            const d = await getDoc(doc(db, 'users', uid));
            if (d.exists()) {
              details.push({ 
                uid, 
                username: d.data().username, 
                shortId: d.data().shortId 
              });
            }
          }
          return details;
        };

        setFriends(await fetchDetails(friendUids));
        setIncomingRequests(await fetchDetails(incomingUids));
        setOutgoingRequests(await fetchDetails(outgoing));
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // 2. Listen to Socket events for online status
  useEffect(() => {
    if (!socket) return;
    socket.on('presence:online-users', (users: string[]) => {
      setOnlineUsers(users);
    });
    return () => {
      socket.off('presence:online-users');
    };
  }, [socket]);

  const handleAddFriend = () => {
    if (!user || !socket) return;
    const term = searchId.trim();
    if (!term.startsWith('#') || term.length !== 7) {
      setError('Please enter a valid ID (e.g. #123456)');
      return;
    }
    if (term === user.shortId) {
      setError("You cannot add yourself.");
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    socket.emit('social:send-request', { targetShortId: term }, (res: any) => {
      setLoading(false);
      if (res.ok) {
        setSuccess(`Request sent to ${res.username}!`);
        setSearchId('');
      } else {
        setError(res.error || 'Failed to send request.');
      }
    });
  };

  const acceptRequest = (targetUid: string) => {
    if (!socket) return;
    socket.emit('social:accept-request', { targetUid }, (res: any) => {
      if (res.ok) setSuccess("Friend request accepted!");
      else setError(res.error || "Failed to accept");
    });
  };

  const declineRequest = (targetUid: string) => {
    if (!socket) return;
    socket.emit('social:decline-request', { targetUid }, (res: any) => {
      if (!res.ok) setError(res.error || "Failed to decline");
    });
  };

  const cancelRequest = (targetUid: string) => {
    if (!socket) return;
    socket.emit('social:cancel-request', { targetUid }, (res: any) => {
      if (!res.ok) setError(res.error || "Failed to cancel");
    });
  };

  const unfriend = (targetUid: string, name: string) => {
    if (!socket) return;
    if (!confirm(`Are you sure you want to remove ${name} from your friends?`)) return;

    socket.emit('social:unfriend', { targetUid }, (res: any) => {
      if (res.ok) setSuccess(`${name} removed from friends.`);
      else setError(res.error || "Failed to unfriend");
    });
  };

  const inviteFriend = (friendUid: string) => {
    if (!socket) return;
    
    if (!onlineUsers.includes(friendUid)) {
      setError("This player is currently offline.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    socket.emit('game:invite', { targetUid: friendUid, fromName: user?.displayName });
    
    setInvitedUids(prev => new Set(prev).add(friendUid));
    setTimeout(() => {
      setInvitedUids(prev => {
        const next = new Set(prev);
        next.delete(friendUid);
        return next;
      });
    }, 5000);
  };

  if (!user) return null;

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
      
      {error && <div className="text-red-400 text-xs mb-3 font-semibold px-1">{error}</div>}
      {success && <div className="text-green-400 text-xs mb-3 font-semibold px-1">{success}</div>}

      {/* Pending Requests Section */}
      {incomingRequests.length > 0 && (
        <div className="mb-6 space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500/60 mb-3 px-1">
            Incoming Requests ({incomingRequests.length})
          </h4>
          {incomingRequests.map(req => (
            <div key={req.uid} className="flex items-center justify-between bg-yellow-500/5 rounded-xl py-3 px-4 border border-yellow-500/10 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 font-bold text-xs border border-yellow-500/20">
                  {req.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">{req.username}</span>
                  <span className="text-[10px] text-gray-400 font-medium uppercase">{req.shortId}</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => acceptRequest(req.uid)}
                  className="bg-green-500 hover:bg-green-400 text-black font-black text-[9px] uppercase px-3 py-1.5 rounded-lg transition-all"
                >
                  Accept
                </button>
                <button 
                  onClick={() => declineRequest(req.uid)}
                  className="bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[9px] uppercase px-3 py-1.5 rounded-lg transition-all"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sent Invitations Section */}
      {outgoingRequests.length > 0 && (
        <div className="mb-6 space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3 px-1">
            Sent Invitations ({outgoingRequests.length})
          </h4>
          {outgoingRequests.map(req => (
            <div key={req.uid} className="flex items-center justify-between bg-white/[0.02] rounded-xl py-3 px-4 border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 font-bold text-xs border border-white/10">
                  {req.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-400">{req.username}</span>
                  <span className="text-[10px] text-gray-500 font-medium uppercase">{req.shortId}</span>
                </div>
              </div>
              <button 
                onClick={() => cancelRequest(req.uid)}
                className="text-[9px] font-bold uppercase text-red-500/60 hover:text-red-500 px-2 py-1 transition-colors"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Friends List Section */}
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3 px-1">Your Friends</h4>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
        {friends.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-4 italic">
            {incomingRequests.length > 0 
              ? "Accept requests to see friends here!" 
              : "No friends yet. Add someone using their ID!"}
          </div>
        ) : (
          friends.map(friend => {
            const isOnline = onlineUsers.includes(friend.uid);
            const isInvited = invitedUids.has(friend.uid);
            
            return (
              <div key={friend.uid} className="flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-xl py-3 px-4 border border-white/5 transition-colors group relative">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-gray-700'}`}></div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white group-hover:text-yellow-500 transition-colors uppercase tracking-tight">{friend.username}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 font-medium uppercase">{friend.shortId}</span>
                      <button 
                        onClick={() => unfriend(friend.uid, friend.username)}
                        className="text-[9px] font-bold text-red-500/0 group-hover:text-red-500/40 hover:!text-red-500 transition-all uppercase"
                      >
                        • Remove
                      </button>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => inviteFriend(friend.uid)}
                  className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${
                    isInvited
                      ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                      : isOnline 
                        ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]' 
                        : 'bg-white/5 text-gray-500 cursor-pointer hover:bg-white/10'
                  }`}
                >
                  {isInvited ? '✓ Sent' : isOnline ? 'Invite' : 'Offline'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
