
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DifficultyLevel, Board, GameStatus } from './types';
import { DIFFICULTIES } from './constants';
import { createEmptyBoard, generateGuaranteedBoard, floodFill, findHint } from './utils/gameLogic';
import { Cell } from './components/Cell';

const App: React.FC = () => {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DifficultyLevel.BEGINNER);
  const [board, setBoard] = useState<Board>([]);
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [flags, setFlags] = useState(0);
  const [timer, setTimer] = useState(0);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  const timerRef = useRef<number | null>(null);
  const config = DIFFICULTIES[difficulty];

  // 窗口大小监听
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 动态计算最佳格子大小
  const cellSize = useMemo(() => {
    // 预留 UI 空间：页眉约 140px，底部面板约 200px，外边距和间隙约 100px
    const reservedHeight = 440; 
    const reservedWidth = 64; // 左右 padding
    
    // 最大宽度限制在 896px (max-w-4xl)
    const availableWidth = Math.min(windowSize.width - reservedWidth, 896);
    const availableHeight = windowSize.height - reservedHeight;

    const sizeByWidth = Math.floor((availableWidth - (config.cols * 3)) / config.cols);
    const sizeByHeight = Math.floor((availableHeight - (config.rows * 3)) / config.rows);
    
    // 限制大小范围，确保可点击且不超出视口
    return Math.max(Math.min(sizeByWidth, sizeByHeight, 40), 18);
  }, [windowSize, config]);

  const clearHints = (currentBoard: Board): Board => {
    return currentBoard.map(row => row.map(cell => ({ ...cell, isHinted: false, hintType: null })));
  };

  const initGame = useCallback(() => {
    setBoard(createEmptyBoard(config.rows, config.cols));
    setStatus(GameStatus.IDLE);
    setFlags(0);
    setTimer(0);
    setHintMessage(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [config]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const checkWin = useCallback((currentBoard: Board) => {
    let revealedCount = 0;
    currentBoard.forEach(row => row.forEach(cell => {
      if (cell.isRevealed) revealedCount++;
    }));

    const totalCells = config.rows * config.cols;
    if (revealedCount === totalCells - config.mines) {
      setStatus(GameStatus.WON);
      if (timerRef.current) clearInterval(timerRef.current);
      const finalBoard = currentBoard.map(row => row.map(cell => {
        if (cell.isMine && !cell.isFlagged) return { ...cell, isFlagged: true };
        return cell;
      }));
      setBoard(finalBoard);
      setFlags(config.mines);
    }
  }, [config]);

  const handleCellClick = async (x: number, y: number) => {
    if (status === GameStatus.WON || status === GameStatus.LOST || board[x][y].isFlagged) return;

    if (status === GameStatus.IDLE) {
      setStatus(GameStatus.GENERATING);
      await new Promise(resolve => setTimeout(resolve, 50));
      const newBoard = await generateGuaranteedBoard(config.rows, config.cols, config.mines, x, y);
      floodFill(newBoard, x, y);
      setBoard(newBoard);
      setStatus(GameStatus.PLAYING);
      timerRef.current = window.setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
      return;
    }

    let newBoard: Board = clearHints([...board.map(row => [...row])]);
    setHintMessage(null);

    if (newBoard[x][y].isMine) {
      newBoard[x][y].isRevealed = true;
      newBoard.forEach(row => row.forEach(c => { if (c.isMine) c.isRevealed = true; }));
      setStatus(GameStatus.LOST);
      if (timerRef.current) clearInterval(timerRef.current);
      setBoard(newBoard);
      return;
    }

    floodFill(newBoard, x, y);
    setBoard(newBoard);
    checkWin(newBoard);
  };

  const handleRightClick = (e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault();
    if (status !== GameStatus.PLAYING && status !== GameStatus.IDLE) return;
    if (board[x][y].isRevealed) return;
    const newBoard = clearHints([...board.map(row => [...row])]);
    setHintMessage(null);
    const isNowFlagged = !newBoard[x][y].isFlagged;
    newBoard[x][y].isFlagged = isNowFlagged;
    setBoard(newBoard);
    setFlags(prev => isNowFlagged ? prev + 1 : prev - 1);
  };

  const handleCellDoubleClick = (x: number, y: number) => {
    if (status !== GameStatus.PLAYING) return;
    const cell = board[x][y];
    if (!cell.isRevealed || cell.neighborCount === 0) return;

    let flagCount = 0;
    const neighbors: {nx: number, ny: number}[] = [];
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const nx = x + i, ny = y + j;
        if (nx >= 0 && nx < config.rows && ny >= 0 && ny < config.cols && (i !== 0 || j !== 0)) {
          neighbors.push({nx, ny});
          if (board[nx][ny].isFlagged) flagCount++;
        }
      }
    }

    if (flagCount === cell.neighborCount) {
      const newBoard = clearHints([...board.map(row => [...row])]);
      let hitMine = false;
      neighbors.forEach(({nx, ny}) => {
        if (!newBoard[nx][ny].isFlagged && !newBoard[nx][ny].isRevealed) {
          if (newBoard[nx][ny].isMine) { newBoard[nx][ny].isRevealed = true; hitMine = true; }
          else { floodFill(newBoard, nx, ny); }
        }
      });
      if (hitMine) {
        newBoard.forEach(row => row.forEach(c => { if (c.isMine) c.isRevealed = true; }));
        setStatus(GameStatus.LOST);
        if (timerRef.current) clearInterval(timerRef.current);
      }
      setBoard(newBoard);
      checkWin(newBoard);
    }
  };

  const triggerHint = () => {
    if (status !== GameStatus.PLAYING) return;
    const hint = findHint(board);
    if (hint) {
      const newBoard = [...board.map(row => [...row])];
      newBoard[hint.x][hint.y].isHinted = true;
      newBoard[hint.x][hint.y].hintType = hint.type;
      setBoard(newBoard);
      const prefix = hint.logic === 'ADVANCED' ? "【二阶推演】" : "【基础逻辑】";
      const desc = hint.type === 'SAFE' ? "通过集合约减，此格必然安全。" : "基于格间约束，此格确定是雷。";
      setHintMessage(`${prefix} ${desc}`);
    } else {
      setHintMessage("当前局势复杂，已超出推演内核识别范围。");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 text-slate-200 overflow-hidden">
      {/* 顶部页眉 */}
      <div className="w-full max-w-4xl bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 mb-4 lg:mb-6 border border-slate-800 shadow-2xl shrink-0">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-6">
          <div className="flex flex-col items-start gap-1">
            <h1 className="text-2xl lg:text-3xl font-black bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
              MASTER MINESWEEPER
            </h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              二阶子集约减引擎 • V2.1
            </p>
          </div>

          <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {(Object.keys(DIFFICULTIES) as DifficultyLevel[]).map(level => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`
                  px-3 lg:px-5 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-all duration-300
                  ${difficulty === level 
                    ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}
                `}
              >
                {DIFFICULTIES[level].name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 lg:gap-6">
             <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-600 uppercase tracking-tighter font-black mb-1">地雷</span>
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                  <i className="fa-solid fa-bomb text-orange-500 text-xs"></i>
                  <span className="text-lg lg:text-xl font-mono text-orange-400 font-bold leading-none">{Math.max(0, config.mines - flags)}</span>
                </div>
             </div>
             <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-600 uppercase tracking-tighter font-black mb-1">计时</span>
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                  <i className="fa-regular fa-clock text-blue-500 text-xs"></i>
                  <span className="text-lg lg:text-xl font-mono text-blue-400 font-bold leading-none">{timer}</span>
                </div>
             </div>
             <button 
                onClick={initGame}
                className="w-10 h-10 lg:w-12 lg:h-12 bg-slate-800 hover:bg-indigo-600 group rounded-xl flex items-center justify-center transition-all duration-300 hover:shadow-[0_0_20px_rgba(79,70,229,0.3)] border border-slate-700"
             >
                <i className={`fa-solid transition-transform group-hover:rotate-180 duration-500 ${status === GameStatus.WON ? 'fa-face-smile text-emerald-400 group-hover:text-white' : status === GameStatus.LOST ? 'fa-face-frown text-red-400 group-hover:text-white' : 'fa-rotate-right text-slate-300 group-hover:text-white'}`}></i>
             </button>
          </div>
        </div>
      </div>

      {/* 游戏主体：动态缩放容器 */}
      <div className="relative group shrink min-h-0">
        {status === GameStatus.GENERATING && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center rounded-2xl">
            <div className="flex flex-col items-center gap-5 p-10 bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl">
              <div className="relative">
                <div className="w-12 h-12 lg:w-16 lg:h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className="fa-solid fa-brain text-indigo-400 animate-pulse"></i>
                </div>
              </div>
              <div className="text-center">
                <span className="text-white font-black tracking-widest uppercase text-xs lg:text-sm block mb-2">深度逻辑拓扑生成中</span>
                <span className="text-slate-500 text-[10px] font-medium italic">正在验证棋盘是否支持二阶子集约减...</span>
              </div>
            </div>
          </div>
        )}

        <div 
          className="bg-slate-900 p-2 rounded-2xl shadow-2xl border-2 lg:border-4 border-slate-800 overflow-hidden mx-auto"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${config.cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${config.rows}, ${cellSize}px)`,
            gap: '2px',
            width: 'fit-content'
          }}
        >
          {board.map((row, x) => 
            row.map((cell, y) => (
              <Cell 
                key={`${x}-${y}`}
                data={cell} 
                status={status}
                cellSize={cellSize}
                onClick={() => handleCellClick(x, y)}
                onContextMenu={(e) => handleRightClick(e, x, y)}
                onDoubleClick={() => handleCellDoubleClick(x, y)}
              />
            ))
          )}
        </div>
      </div>

      {/* 底部功能区：推演内核与操作指南 */}
      <div className="w-full max-w-4xl mt-4 lg:mt-6 flex flex-col gap-3 lg:gap-4 shrink-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4">
          
          {/* 推演内核面板 */}
          <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 p-4 lg:p-5 rounded-2xl flex items-center gap-4 lg:gap-5 group transition-all hover:bg-slate-800/80 border-l-4 border-l-indigo-500 shadow-lg">
            <button 
              onClick={triggerHint}
              disabled={status !== GameStatus.PLAYING}
              className={`
                flex-shrink-0 w-12 h-12 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center text-2xl lg:text-3xl transition-all duration-300
                ${status === GameStatus.PLAYING 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_10px_20px_rgba(79,70,229,0.3)] active:scale-90' 
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'}
              `}
            >
              <i className="fa-solid fa-microchip"></i>
            </button>
            <div className="flex flex-col gap-1 lg:gap-1.5 flex-1 overflow-hidden">
              <span className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 font-black flex items-center gap-2">
                DEDUCTION CORE
                {status === GameStatus.PLAYING && <span className="inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>}
              </span>
              <p className="text-slate-300 text-xs lg:text-sm leading-relaxed font-medium truncate">
                {hintMessage || (status === GameStatus.IDLE ? "待命中：逻辑验证确保100%可解。" : "就绪：点击芯片图标获取二阶子集推导结果。")}
              </p>
            </div>

            <div className="flex-shrink-0">
              {status === GameStatus.WON && (
                <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-black border border-emerald-500/30 uppercase animate-bounce">Win</div>
              )}
              {status === GameStatus.LOST && (
                <div className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-[10px] font-black border border-red-500/30 uppercase">Fail</div>
              )}
            </div>
          </div>

          {/* 操作介绍面板 */}
          <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800 p-3 lg:p-4 rounded-2xl flex flex-row lg:flex-col justify-between lg:justify-center gap-2 lg:gap-3">
             <div className="flex items-center gap-2 lg:gap-3 text-slate-400 hover:text-slate-200 transition-colors">
                <div className="hidden sm:flex w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-slate-950 border border-slate-800 items-center justify-center text-[10px]">
                  <i className="fa-solid fa-arrow-pointer"></i>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-tighter text-slate-500">左键</span>
                  <span className="text-[10px] lg:text-xs font-bold whitespace-nowrap">揭开区域</span>
                </div>
             </div>
             <div className="flex items-center gap-2 lg:gap-3 text-slate-400 hover:text-slate-200 transition-colors">
                <div className="hidden sm:flex w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-slate-950 border border-slate-800 items-center justify-center text-[10px]">
                  <i className="fa-solid fa-flag"></i>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-tighter text-slate-500">右键</span>
                  <span className="text-[10px] lg:text-xs font-bold whitespace-nowrap">标记地雷</span>
                </div>
             </div>
             <div className="flex items-center gap-2 lg:gap-3 text-slate-400 hover:text-slate-200 transition-colors">
                <div className="hidden sm:flex w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-slate-950 border border-slate-800 items-center justify-center text-[10px]">
                  <i className="fa-solid fa-bolt"></i>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-tighter text-slate-500">双击</span>
                  <span className="text-[10px] lg:text-xs font-bold whitespace-nowrap">智能开图</span>
                </div>
             </div>
          </div>

        </div>
      </div>
      
      <div className="mt-4 lg:mt-6 opacity-20 text-slate-700 text-[8px] uppercase tracking-[0.4em] font-black flex justify-center gap-10 shrink-0">
        <span>Subset Reduction Engine v2.1</span>
        <span>Adaptive Layout System</span>
      </div>
    </div>
  );
};

export default App;
