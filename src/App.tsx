/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, MonitorPlay, Volume1, VolumeX } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };

const TRACKS = [
  { id: 1, title: 'Neon Nights (AI Sequence)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'Cyber Drift (AI Iteration)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
  { id: 3, title: 'Digital Oasis (AI Algo)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3' },
];

export default function App() {
  // --- Game State & Refs ---
  const snakeRef = useRef(INITIAL_SNAKE);
  const directionRef = useRef(INITIAL_DIRECTION);
  const foodRef = useRef({ x: 5, y: 5 });
  const directionQueueRef = useRef<{ x: number, y: number }[]>([]);

  const [, setRenderTrigger] = useState(0); // Used to force re-renders from game loop
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isGameRunning, setIsGameRunning] = useState(false);

  // --- Audio State & Refs ---
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.5);

  // ----- AUDIO LOGIC -----

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio playback error:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIdx]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const nextTrack = () => setCurrentTrackIdx((i) => (i + 1) % TRACKS.length);
  const prevTrack = () => setCurrentTrackIdx((i) => (i - 1 + TRACKS.length) % TRACKS.length);

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  // ----- GAME LOGIC -----

  const startGame = () => {
    setIsGameRunning(true);
    setGameOver(false);
    // Auto-start music if not playing
    if (!isPlaying) setIsPlaying(true);
  };

  const resetGame = () => {
    snakeRef.current = INITIAL_SNAKE;
    directionRef.current = INITIAL_DIRECTION;
    directionQueueRef.current = [];
    foodRef.current = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
    setScore(0);
    setGameOver(false);
    setIsGameRunning(true);
    setRenderTrigger(p => p + 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ') {
        if (gameOver) {
          resetGame();
        } else if (!isGameRunning && score === 0) {
          startGame();
        } else {
          setIsGameRunning(p => !p);
        }
        return;
      }

      const lastDir = directionQueueRef.current.length > 0
        ? directionQueueRef.current[directionQueueRef.current.length - 1]
        : directionRef.current;

      let nextDir = null;
      if ((e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') && lastDir.y === 0) nextDir = { x: 0, y: -1 };
      if ((e.key === 'ArrowDown' || e.key.toLowerCase() === 's') && lastDir.y === 0) nextDir = { x: 0, y: 1 };
      if ((e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') && lastDir.x === 0) nextDir = { x: -1, y: 0 };
      if ((e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') && lastDir.x === 0) nextDir = { x: 1, y: 0 };

      if (nextDir) {
        directionQueueRef.current.push(nextDir);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, isGameRunning, score]);

  useEffect(() => {
    if (!isGameRunning || gameOver) return;

    const interval = setInterval(() => {
      let currentDir = directionRef.current;
      if (directionQueueRef.current.length > 0) {
        currentDir = directionQueueRef.current.shift()!;
        directionRef.current = currentDir;
      }

      const head = snakeRef.current[0];
      const newHead = { x: head.x + currentDir.x, y: head.y + currentDir.y };

      // Check collision
      if (
        newHead.x < 0 || newHead.x >= GRID_SIZE ||
        newHead.y < 0 || newHead.y >= GRID_SIZE ||
        snakeRef.current.some(segment => segment.x === newHead.x && segment.y === newHead.y)
      ) {
        setGameOver(true);
        setIsGameRunning(false);
        return;
      }

      const newSnake = [newHead, ...snakeRef.current];

      // Check food
      if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
        setScore(s => s + 10);
        let newX, newY;
        while (true) {
          newX = Math.floor(Math.random() * GRID_SIZE);
          newY = Math.floor(Math.random() * GRID_SIZE);
          if (!newSnake.some(s => s.x === newX && s.y === newY)) {
            break;
          }
        }
        foodRef.current = { x: newX, y: newY };
      } else {
        newSnake.pop();
      }

      snakeRef.current = newSnake;
      setRenderTrigger(prev => prev + 1);
    }, 120);

    return () => clearInterval(interval);
  }, [isGameRunning, gameOver]);

  return (
    <div className="h-screen w-full font-mono flex flex-col justify-between selection:bg-fuchsia-500/30">
      {/* Header */}
      <header className="p-6 md:p-8 text-center border-b border-fuchsia-900/40 bg-slate-950/80 backdrop-blur-md relative z-10">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/50 to-transparent"></div>
        <h1 className="text-4xl md:text-5xl font-display font-black italic tracking-[0.2em] text-fuchsia-500 neon-text-fuchsia">
          SNAKE.WAV
        </h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col md:flex-row items-center justify-center p-4 gap-8 md:gap-16 relative">
        
        {/* Left Side: Stats & Instructions */}
        <div className="flex flex-row md:flex-col gap-6 md:gap-8 w-full max-w-[500px] md:max-w-[200px] justify-between z-10">
          <div className="bg-slate-900/60 p-6 rounded-xl border border-cyan-500/30 neon-border-cyan flex-1 md:flex-none">
            <h2 className="text-xs md:text-sm font-bold text-cyan-600 mb-2 uppercase tracking-widest">Score</h2>
            <div className="text-4xl md:text-5xl font-black text-cyan-400 neon-text-cyan tabular-nums">
              {score.toString().padStart(4, '0')}
            </div>
          </div>
          
          <div className="bg-slate-900/60 p-6 rounded-xl border border-fuchsia-500/30 neon-border-fuchsia flex-1 md:flex-none flex flex-col items-center md:items-start">
            <h2 className="text-xs md:text-sm font-bold text-fuchsia-600 mb-4 uppercase tracking-widest text-center md:text-left w-full">Controls</h2>
            <div className="grid grid-cols-3 gap-2 w-max text-center text-fuchsia-300 font-display">
              <div></div>
              <div className="border border-fuchsia-500/50 rounded shadow-[inset_0_0_8px_rgba(217,70,239,0.2)] p-2 md:p-3 bg-slate-950/50 text-sm md:text-base">W</div>
              <div></div>
              <div className="border border-fuchsia-500/50 rounded shadow-[inset_0_0_8px_rgba(217,70,239,0.2)] p-2 md:p-3 bg-slate-950/50 text-sm md:text-base">A</div>
              <div className="border border-fuchsia-500/50 rounded shadow-[inset_0_0_8px_rgba(217,70,239,0.2)] p-2 md:p-3 bg-slate-950/50 text-sm md:text-base">S</div>
              <div className="border border-fuchsia-500/50 rounded shadow-[inset_0_0_8px_rgba(217,70,239,0.2)] p-2 md:p-3 bg-slate-950/50 text-sm md:text-base">D</div>
            </div>
            <div className="mt-6 text-[10px] md:text-xs text-center text-fuchsia-400/60 w-full tracking-wider">SPACE = Play/Pause</div>
          </div>
        </div>

        {/* Game Board */}
        <div className="relative w-[340px] h-[340px] md:w-[500px] md:h-[500px] bg-slate-950 rounded-lg border-2 border-fuchsia-500 neon-border-fuchsia overflow-hidden flex-shrink-0">
          
          {/* Grid Pattern Background */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'linear-gradient(rgba(217, 70, 239, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(217, 70, 239, 0.4) 1px, transparent 1px)',
              backgroundSize: '5% 5%'
            }}
          />

          {/* Snake */}
          {snakeRef.current.map((segment, idx) => (
            <div 
              key={`snake-${segment.x}-${segment.y}-${idx}`}
              className={`absolute w-[5%] h-[5%] rounded-sm transition-all duration-75 ${
                idx === 0 
                  ? 'bg-white shadow-[0_0_15px_white] z-10' 
                  : 'bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,1)] opacity-90'
              }`}
              style={{
                left: `${segment.x * 5}%`,
                top: `${segment.y * 5}%`
              }}
            />
          ))}

          {/* Food */}
          <div 
            className="absolute w-[5%] h-[5%] bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,1)] rounded-sm animate-pulse z-0"
            style={{
              left: `${foodRef.current.x * 5}%`,
              top: `${foodRef.current.y * 5}%`
            }}
          />

          {/* Overlays */}
          {(!isGameRunning && !gameOver && score === 0) && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <div className="text-2xl md:text-3xl font-display font-bold text-fuchsia-400 mb-8 neon-text-fuchsia tracking-widest text-center">SYSTEM IDLE</div>
              <button 
                onClick={startGame}
                className="px-8 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-display font-black tracking-widest rounded shadow-[0_0_20px_rgba(217,70,239,0.8)] transition-all hover:scale-105 active:scale-95"
              >
                INITIALIZE
              </button>
            </div>
          )}

          {(gameOver) && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-20">
              <div className="text-3xl md:text-4xl font-display font-black text-rose-500 mb-4 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)] tracking-widest text-center">FATAL ERROR</div>
              <div className="text-lg md:text-xl text-fuchsia-300 mb-8 font-mono">FINAL SCORE // <span className="text-white font-bold">{score}</span></div>
              <button 
                onClick={resetGame}
                className="px-8 py-3 border-2 border-fuchsia-500 text-fuchsia-400 hover:bg-fuchsia-500 hover:text-white font-display font-black tracking-widest rounded shadow-[0_0_15px_rgba(217,70,239,0.5)] transition-all hover:scale-105 active:scale-95"
              >
                REBOOT
              </button>
            </div>
          )}

          {/* Pause Overlay */}
          {(!isGameRunning && score > 0 && !gameOver) && (
            <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center z-20">
              <div className="text-2xl font-display font-bold text-cyan-400 neon-text-cyan tracking-[0.3em]">PAUSED</div>
            </div>
          )}
        </div>
      </main>

      {/* Footer / Music Player */}
      <footer className="h-28 md:h-24 bg-slate-900 border-t border-cyan-900/50 flex flex-col md:flex-row items-center px-4 md:px-8 justify-between relative shadow-[0_-10px_30px_rgba(34,211,238,0.05)] pb-4 md:pb-0">
        
        {/* Scrubber Background Bar */}
        <div 
          className="absolute -top-1.5 left-0 h-3 w-full cursor-pointer hover:h-4 transition-all z-30 group"
          onClick={(e) => {
            if (audioRef.current && audioRef.current.duration) {
              const rect = e.currentTarget.getBoundingClientRect();
              const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              audioRef.current.currentTime = p * audioRef.current.duration;
              setProgress(p * 100);
            }
          }}
        >
          <div className="w-full h-[3px] group-hover:h-full bg-slate-800 transition-all absolute bottom-0"></div>
          <div 
            className="h-[3px] group-hover:h-full bg-cyan-500 group-hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)] transition-all ease-linear absolute bottom-0" 
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Track Info */}
        <div className="flex items-center gap-4 w-full md:w-1/3 mb-4 md:mb-0 mt-4 md:mt-0">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-950 rounded lg flex items-center justify-center border border-cyan-500/30 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)] flex-shrink-0">
            <MonitorPlay className="text-cyan-400" size={20} />
          </div>
          <div className="overflow-hidden">
            <div className="font-bold text-cyan-200 truncate text-sm md:text-base font-display tracking-wide">{TRACKS[currentTrackIdx].title}</div>
            <div className="text-[10px] md:text-xs text-cyan-600 tracking-widest uppercase">Auto-Generated Stream</div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-6 w-full md:w-1/3 order-first md:order-none mt-2 md:mt-0">
          <button onClick={prevTrack} className="text-cyan-600 hover:text-cyan-300 hover:scale-110 transition-all duration-200">
            <SkipBack size={24} />
          </button>
          <button 
            onClick={togglePlay} 
            className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 transition-all duration-300 shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.6)]"
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
          </button>
          <button onClick={nextTrack} className="text-cyan-600 hover:text-cyan-300 hover:scale-110 transition-all duration-200">
            <SkipForward size={24} />
          </button>
        </div>

        {/* Volume Control (Hidden on very small mobile) */}
        <div className="hidden md:flex w-1/3 justify-end items-center gap-3">
          {volume === 0 ? <VolumeX className="text-cyan-700" size={18}/> : <Volume1 className="text-cyan-600" size={18}/>}
          <div 
            className="w-24 h-2 bg-slate-950 border border-slate-700 rounded-full cursor-pointer relative overflow-hidden group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const v = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
              setVolume(v);
            }}
          >
            <div 
              className="h-full bg-cyan-600 group-hover:bg-cyan-400 transition-colors shadow-[0_0_10px_rgba(34,211,238,0.5)]" 
              style={{ width: `${volume * 100}%` }}
            />
          </div>
          <Volume2 className="text-cyan-600" size={18}/>
        </div>

        {/* Hidden Audio Element */}
        <audio 
          ref={audioRef} 
          src={TRACKS[currentTrackIdx].url} 
          onTimeUpdate={handleTimeUpdate} 
          onEnded={nextTrack} 
        />
      </footer>
    </div>
  );
}

