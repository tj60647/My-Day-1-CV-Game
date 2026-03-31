import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bug, Terminal, Zap, Trophy, Play, RefreshCw, MapPin, Building2, Cpu, GraduationCap } from 'lucide-react';

// --- Types ---

type GameState = 'START' | 'PLAYING' | 'LEVEL_COMPLETE' | 'GAME_OVER' | 'VICTORY';

interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Player extends Entity {
  speed: number;
  health: number;
  maxHealth: number;
}

interface Enemy extends Entity {
  type: 'syntax' | 'logic' | 'memory';
  speed: number;
  health: number;
  color: string;
}

interface Projectile extends Entity {
  speed: number;
  damage: number;
}

interface Level {
  name: string;
  location: string;
  description: string;
  bugCount: number;
  background: string;
  icon: React.ReactNode;
}

// --- Constants ---

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PLAYER_SIZE = 40;
const BUG_SIZE = 30;
const PROJECTILE_SIZE = 10;

const LEVELS: Level[] = [
  {
    name: "WildThink Prototyping",
    location: "San Francisco, CA",
    description: "The Animal Vending Machines are glitching! Debug the sensors.",
    bugCount: 10,
    background: "#1a1a1a",
    icon: <MapPin className="w-6 h-6" />
  },
  {
    name: "SapientNitro IoT Lab",
    location: "Chicago, IL",
    description: "The million-dollar budget IoT lab is overrun by logic bombs.",
    bugCount: 15,
    background: "#151619",
    icon: <Building2 className="w-6 h-6" />
  },
  {
    name: "Colloquy of Mobiles",
    location: "Paris / Karlsruhe",
    description: "The interactive sculpture is behaving erratically. Fix the cybernetic loops.",
    bugCount: 20,
    background: "#0a0502",
    icon: <Cpu className="w-6 h-6" />
  },
  {
    name: "MIT Media Lab",
    location: "Cambridge, MA",
    description: "The final thesis defense. Destroy the Master Bug of Media Arts.",
    bugCount: 25,
    background: "#1e1e1e",
    icon: <GraduationCap className="w-6 h-6" />
  }
];

// --- Component ---

export const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('START');
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [bugsRemaining, setBugsRemaining] = useState(0);

  // Game Ref State (to avoid re-renders during loop)
  const playerRef = useRef<Player>({
    x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2,
    y: CANVAS_HEIGHT - PLAYER_SIZE - 20,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    speed: 7,
    health: 100,
    maxHealth: 100
  });

  const projectilesRef = useRef<Projectile[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const keysPressed = useRef<Set<string>>(new Set());
  const requestRef = useRef<number>(null);

  const currentLevel = LEVELS[currentLevelIdx];

  // --- Initialization ---

  const initLevel = (idx: number) => {
    const level = LEVELS[idx];
    setBugsRemaining(level.bugCount);
    enemiesRef.current = Array.from({ length: level.bugCount }, () => ({
      x: Math.random() * (CANVAS_WIDTH - BUG_SIZE),
      y: Math.random() * -CANVAS_HEIGHT, // Start off-screen
      width: BUG_SIZE,
      height: BUG_SIZE,
      type: ['syntax', 'logic', 'memory'][Math.floor(Math.random() * 3)] as any,
      speed: 2 + idx * 0.5 + Math.random() * 2,
      health: 1,
      color: ['#ff4444', '#44ff44', '#4444ff'][Math.floor(Math.random() * 3)]
    }));
    projectilesRef.current = [];
    playerRef.current.x = CANVAS_WIDTH / 2 - PLAYER_SIZE / 2;
    setPlayerHealth(100);
  };

  const startGame = () => {
    setCurrentLevelIdx(0);
    setScore(0);
    initLevel(0);
    setGameState('PLAYING');
  };

  const nextLevel = () => {
    if (currentLevelIdx < LEVELS.length - 1) {
      const nextIdx = currentLevelIdx + 1;
      setCurrentLevelIdx(nextIdx);
      initLevel(nextIdx);
      setGameState('PLAYING');
    } else {
      setGameState('VICTORY');
    }
  };

  // --- Input Handling ---

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysPressed.current.add(e.code);
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.code);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- Game Loop ---

  const update = () => {
    if (gameState !== 'PLAYING') return;

    const player = playerRef.current;

    // Move Player
    if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('KeyA')) {
      player.x = Math.max(0, player.x - player.speed);
    }
    if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('KeyD')) {
      player.x = Math.min(CANVAS_WIDTH - player.width, player.x + player.speed);
    }

    // Shoot
    if (keysPressed.current.has('Space')) {
      // Throttle shooting
      if (projectilesRef.current.length < 5) {
        projectilesRef.current.push({
          x: player.x + player.width / 2 - PROJECTILE_SIZE / 2,
          y: player.y,
          width: PROJECTILE_SIZE,
          height: PROJECTILE_SIZE,
          speed: 10,
          damage: 1
        });
        keysPressed.current.delete('Space'); // Require re-press or use a timer
      }
    }

    // Update Projectiles
    projectilesRef.current = projectilesRef.current.filter(p => {
      p.y -= p.speed;
      return p.y > -p.height;
    });

    // Update Enemies
    enemiesRef.current.forEach(enemy => {
      enemy.y += enemy.speed;
      // Wrap around or respawn if missed
      if (enemy.y > CANVAS_HEIGHT) {
        enemy.y = -BUG_SIZE;
        enemy.x = Math.random() * (CANVAS_WIDTH - BUG_SIZE);
      }
    });

    // Collision Detection: Projectile vs Enemy
    projectilesRef.current.forEach((p, pIdx) => {
      enemiesRef.current.forEach((e, eIdx) => {
        if (
          p.x < e.x + e.width &&
          p.x + p.width > e.x &&
          p.y < e.y + e.height &&
          p.y + p.height > e.y
        ) {
          // Hit!
          enemiesRef.current.splice(eIdx, 1);
          projectilesRef.current.splice(pIdx, 1);
          setScore(s => s + 100);
          setBugsRemaining(b => {
            const newVal = b - 1;
            if (newVal <= 0) {
              setGameState('LEVEL_COMPLETE');
            }
            return newVal;
          });
        }
      });
    });

    // Collision Detection: Player vs Enemy
    enemiesRef.current.forEach((e, eIdx) => {
      if (
        player.x < e.x + e.width &&
        player.x + player.width > e.x &&
        player.y < e.y + e.height &&
        player.y + player.height > e.y
      ) {
        // Damage!
        setPlayerHealth(h => {
          const newHealth = h - 10;
          if (newHealth <= 0) {
            setGameState('GAME_OVER');
          }
          return newHealth;
        });
        enemiesRef.current.splice(eIdx, 1);
        setBugsRemaining(b => b - 1); // Still counts as "gone" but player took damage
      }
    });
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    if (!ctx) return;

    // Clear
    ctx.fillStyle = currentLevel.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Background Grid (Technical Recipe)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Draw Player (TJ)
    const player = playerRef.current;
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    // Draw "TJ" initials on the block
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('TJ', player.x + 10, player.y + 25);

    // Draw Projectiles
    ctx.fillStyle = '#00ffff';
    projectilesRef.current.forEach(p => {
      ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    // Draw Enemies (Bugs)
    enemiesRef.current.forEach(e => {
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + e.height / 2, e.width / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Bug legs
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(e.x + e.width / 2, e.y + e.height / 2);
        ctx.lineTo(
          e.x + e.width / 2 + Math.cos(angle) * 20,
          e.y + e.height / 2 + Math.sin(angle) * 20
        );
        ctx.stroke();
      }
    });

    // Level Text Overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'italic 12px Georgia';
    ctx.fillText(`${currentLevel.location} // ${currentLevel.name}`, 20, 30);
  };

  const loop = () => {
    update();
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) draw(ctx);
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, currentLevelIdx]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#141414] text-[#E4E3E0] font-sans p-4">
      {/* Header / Dashboard */}
      <div className="w-full max-w-[800px] mb-4 grid grid-cols-3 gap-4 border-b border-[#E4E3E0]/20 pb-4">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest opacity-50 font-mono">System Status</span>
          <span className="text-lg font-mono flex items-center gap-2">
            <Zap className={`w-4 h-4 ${gameState === 'PLAYING' ? 'text-green-400 animate-pulse' : 'text-red-400'}`} />
            {gameState}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-widest opacity-50 font-mono">Bugs Squashed</span>
          <span className="text-2xl font-mono text-[#00ff00]">{score.toLocaleString()}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-widest opacity-50 font-mono">Integrity</span>
          <div className="w-32 h-2 bg-gray-800 rounded-full mt-2 overflow-hidden">
            <motion.div 
              className="h-full bg-red-500"
              initial={{ width: '100%' }}
              animate={{ width: `${playerHealth}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="relative border-4 border-[#E4E3E0]/10 rounded-lg overflow-hidden shadow-2xl">
        <canvas 
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block"
        />

        {/* Overlays */}
        <AnimatePresence>
          {gameState === 'START' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-8 text-center"
            >
              <h1 className="text-6xl font-mono font-bold mb-4 tracking-tighter text-[#00ff00]">
                TJ'S DEBUG ODYSSEY
              </h1>
              <p className="font-serif italic text-xl mb-8 opacity-80">
                A career-spanning journey through code, architecture, and the bugs that tried to stop it.
              </p>
              <button 
                onClick={startGame}
                className="group flex items-center gap-3 px-8 py-4 bg-[#00ff00] text-black font-mono font-bold text-xl hover:bg-white transition-colors"
              >
                <Play className="w-6 h-6 fill-current" />
                INITIALIZE_SYSTEM()
              </button>
            </motion.div>
          )}

          {gameState === 'LEVEL_COMPLETE' && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="mb-6 p-4 border border-[#00ff00] rounded-full">
                <Trophy className="w-12 h-12 text-[#00ff00]" />
              </div>
              <h2 className="text-4xl font-mono font-bold mb-2 text-[#00ff00]">LEVEL_CLEARED</h2>
              <p className="text-xl opacity-70 mb-8 max-w-md">
                Successfully debugged the {currentLevel.name} in {currentLevel.location}.
              </p>
              <button 
                onClick={nextLevel}
                className="px-8 py-4 bg-white text-black font-mono font-bold text-xl hover:bg-[#00ff00] transition-colors"
              >
                PROCEED_TO_NEXT_PHASE()
              </button>
            </motion.div>
          )}

          {gameState === 'GAME_OVER' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center p-8 text-center"
            >
              <Bug className="w-20 h-20 text-white mb-6 animate-bounce" />
              <h2 className="text-6xl font-mono font-bold mb-4 text-white">SYSTEM_CRASH</h2>
              <p className="text-xl mb-8 opacity-80">
                The bugs were too many. The architecture collapsed.
              </p>
              <button 
                onClick={startGame}
                className="flex items-center gap-3 px-8 py-4 bg-white text-black font-mono font-bold text-xl hover:bg-red-500 hover:text-white transition-colors"
              >
                <RefreshCw className="w-6 h-6" />
                REBOOT_SYSTEM()
              </button>
            </motion.div>
          )}

          {gameState === 'VICTORY' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-green-900/90 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="text-8xl mb-6">🎓</div>
              <h2 className="text-6xl font-mono font-bold mb-4 text-white">MASTER_OF_DESIGN</h2>
              <p className="text-xl mb-8 opacity-80 max-w-xl">
                From the MIT Media Lab to the streets of San Francisco, you've squashed every bug. 
                The architecture is sound. The IoT is connected.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={startGame}
                  className="px-8 py-4 bg-white text-black font-mono font-bold text-xl hover:bg-green-400 transition-colors"
                >
                  PLAY_AGAIN()
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer / Controls Info */}
      <div className="w-full max-w-[800px] mt-6 grid grid-cols-2 gap-8">
        <div className="p-6 border border-[#E4E3E0]/10 rounded-lg bg-black/20">
          <h3 className="text-[10px] uppercase tracking-widest opacity-50 font-mono mb-4 flex items-center gap-2">
            <Terminal className="w-3 h-3" /> Input_Map
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="opacity-60">Move Left/Right</span>
              <span className="text-[#00ff00]">[A] [D] or [←] [→]</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Deploy Debugger</span>
              <span className="text-[#00ff00]">[SPACE]</span>
            </div>
          </div>
        </div>

        <div className="p-6 border border-[#E4E3E0]/10 rounded-lg bg-black/20">
          <h3 className="text-[10px] uppercase tracking-widest opacity-50 font-mono mb-4 flex items-center gap-2">
            <MapPin className="w-3 h-3" /> Career_Log
          </h3>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-[#E4E3E0]/10 rounded">
              {currentLevel.icon}
            </div>
            <div>
              <p className="text-sm font-bold">{currentLevel.name}</p>
              <p className="text-xs opacity-60 italic font-serif">{currentLevel.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Career Timeline (Technical Recipe) */}
      <div className="w-full max-w-[800px] mt-8 flex justify-between relative px-4">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#E4E3E0]/10 -z-10" />
        {LEVELS.map((level, idx) => (
          <div 
            key={idx}
            className={`flex flex-col items-center gap-2 ${idx <= currentLevelIdx ? 'opacity-100' : 'opacity-20'}`}
          >
            <div className={`w-3 h-3 rounded-full ${idx === currentLevelIdx ? 'bg-[#00ff00] shadow-[0_0_10px_#00ff00]' : 'bg-[#E4E3E0]'}`} />
            <span className="text-[8px] font-mono uppercase tracking-tighter">{level.name.split(' ')[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
