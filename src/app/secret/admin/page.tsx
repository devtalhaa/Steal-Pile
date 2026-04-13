'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { connectSocket, getSocket } from '@/lib/socket';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminUser {
  uid: string;
  email?: string;
  username?: string;
  shortId?: string;
  photoURL?: string;
  friends?: string[];
}

interface AdminRoom {
  code: string;
  players: { id: string; name: string }[];
  hostId: string;
  gameState: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'games'>('users');
  const [authenticated, setAuthenticated] = useState(false);
  const [swapModalState, setSwapModalState] = useState<{ roomCode: string, oldPlayerId: string } | null>(null);
  const [friendsModalState, setFriendsModalState] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem('admin_authenticated') !== 'true') {
      router.push('/secret/login');
      return;
    }

    const socket = connectSocket();
    
    const initAdmin = () => {
      socket.emit('admin:login', { 
        email: 'admin@talha.com', 
        pass: 'talhabutt77' 
      }, (res: any) => {
        if (res.ok) {
          setAuthenticated(true);
          fetchData();
        } else {
          router.push('/secret/login');
        }
      });
    };

    if (socket.connected) {
      initAdmin();
    } else {
      socket.once('connect', initAdmin);
    }

    const interval = setInterval(fetchData, 10000); // Auto refresh every 10s
    return () => {
      clearInterval(interval);
      socket.off('connect', initAdmin);
    };
  }, [router]);

  const fetchData = async () => {
    const socket = getSocket();
    socket.emit('admin:get-all-data', async (res: any) => {
      if (res.ok) {
        setRooms(res.rooms || []);
        
        // If server returned users, use them. Otherwise try client-side fallback.
        if (res.users && res.users.length > 0) {
          setUsers(res.users);
          setError(res.warning || '');
        } else {
          try {
            const querySnapshot = await getDocs(collection(db, 'users'));
            const clientUsers = querySnapshot.docs.map(doc => ({
              uid: doc.id,
              ...doc.data()
            } as AdminUser));
            setUsers(clientUsers);
            setError(res.warning ? `Note: ${res.warning}. Falling back to client-side user fetch.` : '');
          } catch (err: any) {
            setError(`User Fetch Failed: ${err.message}. ${res.warning || ''}`);
          }
        }
      } else {
        setError(res.error || 'Connection error with administrative service.');
      }
      setLoading(false);
    });
  };

  const deleteUser = (uid: string) => {
    if (!confirm('Are you sure you want to PERMANENTLY delete this user? They will be removed from Auth and Firestore.')) return;
    
    const socket = getSocket();
    socket.emit('admin:delete-user', { uid }, (res: any) => {
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.uid !== uid));
      } else {
        alert('Failed to delete user');
      }
    });
  };

  const kickPlayer = (roomCode: string, playerId: string) => {
    if (!confirm('Kick this player from the game?')) return;
    
    const socket = getSocket();
    socket.emit('admin:kick-player', { roomCode, playerId }, (res: any) => {
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to kick player');
      }
    });
  };

  const confirmSwap = (targetUid: string) => {
    if (!swapModalState) return;
    if (!confirm('Are you sure you want to swap this user into the game context?')) return;
    
    const socket = getSocket();
    socket.emit('admin:swap-player', { 
      roomCode: swapModalState.roomCode,
      oldPlayerId: swapModalState.oldPlayerId,
      targetUid 
    }, (res: any) => {
      if (res.ok) {
        setSwapModalState(null);
        fetchData();
        alert('Player successfully swapped!');
      } else {
        alert(`Failed to swap player: ${res.error}`);
      }
    });
  };

  const removeFriend = (userUid: string, friendUid: string) => {
    if (!confirm('Are you sure you want to remove this friend connection?')) return;
    
    const socket = getSocket();
    socket.emit('admin:remove-friend', { userUid, friendUid }, (res: any) => {
      if (res.ok) {
        // Optimistically update the modal user state since we are already viewing them
        if (friendsModalState) {
          setFriendsModalState({
            ...friendsModalState,
            friends: (friendsModalState.friends || []).filter(id => id !== friendUid)
          });
        }
        fetchData();
      } else {
        alert(`Failed to remove friend: ${res.error}`);
      }
    });
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    router.push('/secret/login');
  };

  if (!authenticated || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mb-4" />
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Initialising Admin Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200">
      {/* Sidebar / Header */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.3)]">
              <span className="text-xl">🛠️</span>
            </div>
            <div>
              <h1 className="text-lg font-black text-white uppercase tracking-tighter">Command <span className="text-yellow-500">Center</span></h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Alpha Access 2.0</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              {(['users', 'games'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab ? 'bg-yellow-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button 
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-500 font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              Logout <span>🚪</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl mb-8 text-xs font-bold uppercase tracking-widest text-center"
          >
            ⚠️ {error}
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard title="Total Players" value={users.length} icon="👥" color="yellow" />
          <StatCard title="Ongoing Games" value={rooms.filter(r => r.gameState === 'playing').length} icon="🃏" color="blue" />
          <StatCard title="Active Rooms" value={rooms.length} icon="🏠" color="green" />
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'users' ? (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Registered <span className="text-yellow-500">Users</span></h3>
                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Displaying {users.length} records</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                      <th className="px-8 py-4">User</th>
                      <th className="px-8 py-4">UID / ShortID</th>
                      <th className="px-8 py-4">Email</th>
                      <th className="px-8 py-4 text-center">Friends</th>
                      <th className="px-8 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map(u => (
                      <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold">
                              {u.photoURL ? <img src={u.photoURL} className="w-full h-full rounded-full" /> : (u.username?.charAt(0) || '?')}
                            </div>
                            <span className="font-bold text-white">{u.username || 'Anonymous'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <code className="text-[10px] text-gray-400">{u.uid}</code>
                            <span className="text-[10px] font-black text-yellow-500/60 uppercase">{u.shortId}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm text-gray-400 font-medium">
                          {u.email || <span className="italic opacity-30">None</span>}
                        </td>
                        <td className="px-8 py-5 text-center">
                          <button
                            onClick={() => setFriendsModalState(u)}
                            className="bg-purple-500/10 hover:bg-purple-500 text-purple-500 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            {u.friends?.length || 0} Friends
                          </button>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <button 
                            onClick={() => deleteUser(u.uid)}
                            className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Delete Row
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="games"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {rooms.length === 0 ? (
                <div className="col-span-2 bg-white/5 border border-white/5 rounded-3xl p-20 text-center">
                  <span className="text-4xl block mb-4">🌑</span>
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No active game sessions detected.</p>
                </div>
              ) : rooms.map(room => (
                <div key={room.code} className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-xl">
                  <div className="p-6 bg-white/[0.03] border-b border-white/5 flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-black text-white uppercase tracking-tight">Room <span className="text-yellow-500">{room.code}</span></h4>
                      <div className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${room.gameState === 'playing' ? 'text-green-500' : 'text-yellow-500'}`}>
                        {room.gameState === 'playing' ? '• Ongoing Game' : '• In Lobby'}
                      </div>
                    </div>
                  </div>
                  <div className="p-6 flex-1">
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Active Players</p>
                      {room.players.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white">
                              {p.name.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-white">{p.name} {p.id === room.hostId && <span className="text-yellow-500 text-[10px] ml-1">★</span>}</span>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setSwapModalState({ roomCode: room.code, oldPlayerId: p.id })}
                              className="text-[9px] font-black uppercase text-blue-500 hover:bg-blue-500/10 px-2 py-1 rounded transition-colors"
                            >
                              Swap
                            </button>
                            <button 
                              onClick={() => kickPlayer(room.code, p.id)}
                              className="text-[9px] font-black uppercase text-red-500 hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
                            >
                              Kick
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Swap Modal */}
        <AnimatePresence>
          {swapModalState && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSwapModalState(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                style={{ maxHeight: '80vh' }}
              >
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">Select Replacement Player</h2>
                  <button 
                    onClick={() => setSwapModalState(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[60vh] custom-scrollbar space-y-2">
                  {users.map(u => (
                    <div key={u.uid} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold overflow-hidden">
                          {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : (u.username?.charAt(0) || '?')}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{u.username || 'Anonymous'}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">{u.shortId || u.uid.substring(0, 8)}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => confirmSwap(u.uid)}
                        className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                      >
                        Swap In
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Friends View Modal */}
        <AnimatePresence>
          {friendsModalState && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setFriendsModalState(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                style={{ maxHeight: '80vh' }}
              >
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Friends List</h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{friendsModalState.username}'s Connections</p>
                  </div>
                  <button 
                    onClick={() => setFriendsModalState(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[60vh] custom-scrollbar space-y-2">
                  {(!friendsModalState.friends || friendsModalState.friends.length === 0) ? (
                    <div className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                      No friends found.
                    </div>
                  ) : (
                    friendsModalState.friends.map(friendUid => {
                      const friendData = users.find(u => u.uid === friendUid);
                      return (
                        <div key={friendUid} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 font-bold overflow-hidden">
                              {friendData?.photoURL ? <img src={friendData.photoURL} className="w-full h-full object-cover" /> : (friendData?.username?.charAt(0) || '?')}
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm">{friendData?.username || 'Unknown User'}</div>
                              <div className="text-[10px] text-gray-400 font-bold uppercase">{friendData?.shortId || friendUid.substring(0, 8)}</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeFriend(friendsModalState.uid, friendUid)}
                            className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  const colors: any = {
    yellow: 'from-yellow-500/20 to-yellow-500/5 text-yellow-500',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-500',
    green: 'from-green-500/20 to-green-500/5 text-green-500'
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border border-white/10 p-8 rounded-3xl shadow-xl`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-4xl font-black text-white">{value}</div>
    </div>
  );
}
