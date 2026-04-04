'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useGameActions } from '@/hooks/useGameActions';
import { MiddleCards } from './MiddleCards';
import { DrawPile } from './DrawPile';
import { OpponentSeat } from './OpponentSeat';
import { PlayerHand } from './PlayerHand';
import { ScoreBoard } from './ScoreBoard';
import { CardStack } from '@/components/cards/CardStack';

interface GameTableProps {
  myPlayerId: string;
}

function getTablePositions(totalPlayers: number, myIndex: number) {
  const positions: { x: number; y: number }[] = [];

  for (let i = 0; i < totalPlayers; i++) {
    const offset = ((i - myIndex + totalPlayers) % totalPlayers);

    if (offset === 0) {
      positions.push({ x: 50, y: 88 }); // Bottom (You)
    } else if (totalPlayers === 2) {
      positions.push({ x: 50, y: 15 }); // Top
    } else if (totalPlayers === 3) {
      if (offset === 1) positions.push({ x: 15, y: 40 }); // Top-Left
      if (offset === 2) positions.push({ x: 85, y: 40 }); // Top-Right
    } else if (totalPlayers === 4) {
      if (offset === 1) positions.push({ x: 12, y: 45 }); // Left
      if (offset === 2) positions.push({ x: 50, y: 12 }); // Top
      if (offset === 3) positions.push({ x: 88, y: 45 }); // Right
    } else {
      // Fallback for >4 players
      const opponentsCount = totalPlayers - 1;
      const angleStep = 180 / (opponentsCount + 1);
      const angleDeg = (offset * angleStep);
      const radians = (angleDeg + 180) * (Math.PI / 180); // Start from left, go over top, to right
      const x = 50 + 40 * Math.cos(radians);
      const y = 50 + 35 * Math.sin(radians);
      positions.push({ x, y });
    }
  }

  return positions;
}

export function GameTable({ myPlayerId }: GameTableProps) {
  const gameState = useGameStore(s => s.gameState);
  const pendingAction = useGameStore(s => s.pendingAction);
  const setPendingAction = useGameStore(s => s.setPendingAction);

  const { drawCard, playCard } = useGameActions();

  // Track whether auto-draw is pending so we can show a spinner
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Fullscreen prompt for mobile
  const [showFullscreenBtn, setShowFullscreenBtn] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      const isFS = document.fullscreenElement || (document as any).webkitFullscreenElement;
      const canFS = 'requestFullscreen' in document.documentElement || 'webkitRequestFullscreen' in document.documentElement;
      if (!isFS && canFS) {
        setShowFullscreenBtn(true);
      }
    }
  }, []);

  const handleFullscreen = async () => {
    try {
      const el = document.documentElement as any;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      }
    } catch (e) {
      // Ignore errors
    }
    setShowFullscreenBtn(false);
  };

  // AUTO-DRAW: when it's my turn in draw phase, pull a card automatically
  useEffect(() => {
    if (!gameState) return;

    const isMe = gameState.currentPlayerId === myPlayerId;
    const needsDraw =
      isMe &&
      (gameState.turnPhase === 'draw' || gameState.turnPhase === 'bonus_draw') &&
      !gameState.deckEmpty;

    if (!needsDraw) return;

    setIsDrawing(true);

    const t = setTimeout(() => {
      drawCard();
      setIsDrawing(false);
    }, 500);

    return () => {
      clearTimeout(t);
      setIsDrawing(false);
    };
  }, [gameState?.turnPhase, gameState?.currentPlayerId, gameState?.deckEmpty, gameState?.roundNumber, myPlayerId, drawCard]);

  // Clear pending action banner after a short delay
  useEffect(() => {
    if (pendingAction) {
      const t = setTimeout(() => setPendingAction(null), 2000);
      return () => clearTimeout(t);
    }
  }, [pendingAction, setPendingAction]);

  if (!gameState) {
    return (
      <div className="h-screen flex items-center justify-center felt-bg">
        <div className="text-center">
          <div className="text-4xl animate-spin mb-4">🃏</div>
          <p className="gold-text">Loading game...</p>
        </div>
      </div>
    );
  }

  const { players, middleCards, drawPileCount, turnPhase, currentPlayerId, deckEmpty } = gameState;
  const myPlayer = players.find(p => p.id === myPlayerId);
  const myIndex = players.findIndex(p => p.id === myPlayerId);
  const opponents = players.filter(p => p.id !== myPlayerId);
  const isTeamMode = players.some(p => p.team !== undefined);
  const myTeam = myPlayer?.team;

  const positions = getTablePositions(players.length, myIndex);
  const isCurrentPlayerMe = currentPlayerId === myPlayerId;
  const canPlay = isCurrentPlayerMe && (turnPhase === 'play' || turnPhase === 'bonus_play');

  const myTeamPileTop    = isTeamMode ? (myTeam === 'A' ? gameState.teamAPileTop : gameState.teamBPileTop) : myPlayer?.pileTop;
  const opponentTeam     = myTeam === 'A' ? 'B' : 'A';
  const oppTeamPileTop   = isTeamMode ? (opponentTeam === 'A' ? gameState.teamAPileTop : gameState.teamBPileTop) : null;

  const matchingRanks = [
    ...middleCards.map(c => c.rank),
    myTeamPileTop?.rank,
    ...(isTeamMode
      ? [oppTeamPileTop?.rank]
      : opponents.map(o => o.pileTop?.rank)),
  ].filter(Boolean) as string[];

  const opponentPiles = isTeamMode
    ? (() => {
        const opponentTeam = myTeam === 'A' ? 'B' : 'A';
        const topCard = opponentTeam === 'A' ? gameState.teamAPileTop : gameState.teamBPileTop;
        const count   = opponentTeam === 'A' ? (gameState.teamAPileCount ?? 0) : (gameState.teamBPileCount ?? 0);
        return [{ topCard: topCard ?? null, count, label: `Team ${opponentTeam}` }];
      })()
    : players
        .filter(p => p.id !== myPlayerId)
        .map(p => ({ topCard: p.pileTop, count: p.pileCount, label: p.name }));

  const myPiles = isTeamMode
    ? (() => {
        const topCard = myTeam === 'A' ? gameState.teamAPileTop : gameState.teamBPileTop;
        const count   = myTeam === 'A' ? (gameState.teamAPileCount ?? 0) : (gameState.teamBPileCount ?? 0);
        return [{ topCard: topCard ?? null, count, label: `Team ${myTeam ?? '?'}` }];
      })()
    : players
        .filter(p => p.id === myPlayerId)
        .map(p => ({ topCard: p.pileTop, count: p.pileCount, label: 'You' }));

  const totalDeckCount = players[0]
    ? gameState.drawPileCount
      + players.reduce((s, p) => s + p.handCount, 0)
      + middleCards.length
      + (isTeamMode
          ? (gameState.teamAPileCount ?? 0) + (gameState.teamBPileCount ?? 0)
          : players.reduce((s, p) => s + p.pileCount, 0))
    : 0;

  return (
    <div className="h-screen w-full felt-bg relative overflow-hidden">

      {/* Oval table */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="table-edge"
          style={{
            width: '85vw',
            maxWidth: 900,
            height: '70vh',
            maxHeight: 540,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at 50% 40%, #166534 0%, #0d5016 50%, #052e0a 100%)',
            position: 'relative',
          }}>
          <div className="absolute inset-0 rounded-full"
            style={{
              background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 8px)',
            }} />
          <div className="absolute"
            style={{
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '30%', height: '40%',
              borderRadius: '50%',
              border: '1px solid rgba(212,168,67,0.12)',
            }} />
        </div>
      </div>

      {/* Opponents around the table */}
      <div className="absolute inset-0 pointer-events-none">
        {opponents.map((opponent) => {
          const opIdx = players.findIndex(p => p.id === opponent.id);
          const pos = positions[opIdx];
          if (!pos) return null;

          return (
            <div
              key={opponent.id}
              className="absolute pointer-events-auto"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
              }}>
              <OpponentSeat
                player={opponent}
                isCurrentTurn={currentPlayerId === opponent.id}
                pileHighlighted={canPlay && (isTeamMode ? oppTeamPileTop !== null : opponent.pileTop !== null)}
              />
            </div>
          );
        })}
      </div>

      {/* Center: middle cards + draw pile + team piles */}
      <div className="absolute pointer-events-none"
        style={{
          top: '50%', left: '50%',
          transform: 'translate(-50%, -52%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 15, // slightly more gap
          width: '100%',
        }}>
        <MiddleCards cards={middleCards} />
        
        <div className="flex items-end justify-center gap-8 pointer-events-auto">
          {isTeamMode && (
            <div className="flex flex-col items-center gap-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${myTeam === 'A' ? 'text-green-400' : 'text-gray-400'}`}>
                {myTeam === 'A' ? 'Team A (You)' : 'Team A'}
              </span>
              <CardStack 
                topCard={gameState.teamAPileTop ?? null} 
                count={gameState.teamAPileCount ?? 0} 
                size="md" 
                isHighlighted={false}
              />
            </div>
          )}

          <DrawPile
            count={drawPileCount}
            canDraw={false}        // drawing is now fully automatic
            isEmpty={deckEmpty}
            onDraw={() => {}}
            isAutoDrawing={isDrawing && isCurrentPlayerMe}
          />

          {isTeamMode && (
            <div className="flex flex-col items-center gap-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${myTeam === 'B' ? 'text-green-400' : 'text-gray-400'}`}>
                {myTeam === 'B' ? 'Team B (You)' : 'Team B'}
              </span>
              <CardStack 
                topCard={gameState.teamBPileTop ?? null} 
                count={gameState.teamBPileCount ?? 0} 
                size="md" 
                isHighlighted={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* Action banner */}
      <AnimatePresence>
        {pendingAction && pendingAction.type !== 'draw' && (
          <motion.div
            className="absolute z-30 pointer-events-none"
            style={{ top: '33%', left: '50%', transform: 'translateX(-50%)' }}
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            <div className="px-6 py-3 rounded-2xl text-center font-bold text-lg whitespace-nowrap"
              style={{
                background: (pendingAction.type === 'steal_pile' || pendingAction.type === 'match_and_steal')
                  ? 'linear-gradient(135deg, rgba(185,28,28,0.92), rgba(127,29,29,0.92))'
                  : 'linear-gradient(135deg, rgba(21,128,61,0.92), rgba(22,163,74,0.92))',
                border: '2px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                color: 'white',
              }}>
              {pendingAction.type === 'steal_pile' && '🔥 STEAL!'}
              {pendingAction.type === 'match_middle' && '✅ MATCH!'}
              {pendingAction.type === 'match_own' && '⬆️ MATCHED OWN PILE!'}
              {pendingAction.type === 'match_and_steal' && '⚡ MATCH & STEAL!'}
              {pendingAction.type === 'play_to_middle' && '→ No match — card to middle'}
              {(pendingAction.type === 'round_over' || pendingAction.type === 'game_over') && '🃏 Round Over'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top left info: Player badge & Score board */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 pointer-events-auto">
        {myPlayer && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full w-fit"
            style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${myPlayer.team === 'A' ? 'team-a' : myPlayer.team === 'B' ? 'team-b' : 'bg-gray-600 text-white'}`}>
              {myPlayer.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-sm">{myPlayer.name}</span>
            {myPlayer.team && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${myPlayer.team === 'A' ? 'team-a' : 'team-b'}`}>
                Team {myPlayer.team}
              </span>
            )}
            {isCurrentPlayerMe && (
              <motion.span
                className="text-[10px] gold-text font-bold ml-1"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1, repeat: Infinity }}>
                YOUR TURN
              </motion.span>
            )}
          </div>
        )}
        <ScoreBoard gameState={gameState} myPlayerId={myPlayerId} />
      </div>

      {/* Deck-empty badge — top right */}
      {deckEmpty && (
        <div className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{
            background: 'rgba(127,29,29,0.85)',
            border: '1px solid rgba(239,68,68,0.4)',
            color: '#fca5a5',
          }}>
          🃏 Deck Empty — 1 card/turn
        </div>
      )}

      {/* My hand — bottom */}
      {myPlayer && (
        <div className="absolute bottom-0 left-0 right-0 pb-3 flex flex-col items-center z-20 pointer-events-auto">
          <PlayerHand
            hand={gameState.myHand}
            pileTop={isTeamMode ? (myTeamPileTop ?? null) : myPlayer.pileTop}
            pileCount={isTeamMode
              ? (myTeam === 'A' ? (gameState.teamAPileCount ?? 0) : (gameState.teamBPileCount ?? 0))
              : myPlayer.pileCount}
            playerName={myPlayer.name}
            team={myPlayer.team}
            isMyTurn={isCurrentPlayerMe}
            turnPhase={turnPhase}
            canPlay={canPlay}
            onPlayCard={playCard}
            drawPileEmpty={deckEmpty}
            isDrawing={isDrawing && isCurrentPlayerMe}
            matchingRanks={matchingRanks}
          />
        </div>
      )}

      {/* Waiting indicator — when it's someone else's turn */}
      {!isCurrentPlayerMe && (
        <div className="absolute top-1/2 right-3 -translate-y-1/2 z-20">
          <div className="px-3 py-2 rounded-xl text-xs text-center"
            style={{
              background: 'rgba(0,0,0,0.65)',
              border: '1px solid rgba(212,168,67,0.2)',
            }}>
            <div className="gold-text font-bold mb-0.5">WAITING</div>
            <div className="text-gray-400 truncate max-w-20">
              {players.find(p => p.id === currentPlayerId)?.name}
            </div>
            <div className="text-gray-600 text-[10px]">is playing</div>
          </div>
        </div>
      )}

      {/* Fullscreen Mobile Overlay */}
      <AnimatePresence>
        {showFullscreenBtn && (
          <motion.div 
            className="fixed inset-0 z-[9990] flex items-center justify-center p-6 portrait:hidden"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-gray-800 border-2 border-yellow-500 rounded-2xl p-6 text-center max-w-sm flex flex-col items-center">
              <div className="text-5xl mb-4">🔲</div>
              <h3 className="text-xl font-bold text-yellow-400 mb-2">Immersive Mode</h3>
              <p className="text-sm text-gray-300 mb-6">
                Tap the button below to hide your browser's tabs and address bar, expanding the game to your full screen!
              </p>
              <button 
                onClick={handleFullscreen}
                className="btn-gold w-full text-lg shadow-lg"
              >
                Go Fullscreen
              </button>
              <button 
                onClick={() => setShowFullscreenBtn(false)}
                className="mt-4 text-xs text-gray-400 underline"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Portrait Orientation Prompt */}
      <div className="portrait-prompt fixed inset-0 z-[9999] flex-col items-center justify-center bg-gray-900 text-white p-8">
        <motion.div 
          className="text-7xl mb-6"
          animate={{ rotate: [0, -90, -90, 0] }}
          transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
        >
          📱
        </motion.div>
        <h2 className="text-3xl font-bold mb-3 text-center text-yellow-500">Rotate Device</h2>
        <p className="text-center text-lg text-gray-300 max-w-xs">
          Khoti is best played in Landscape mode. Please rotate your phone to continue playing!
        </p>
      </div>
    </div>
  );
}
