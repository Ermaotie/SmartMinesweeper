
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DifficultyLevel, Board, GameStatus } from './types';
import { DIFFICULTIES } from './constants';
import { createEmptyBoard, generateGuaranteedBoard, floodFill, findHint } from './utils/gameLogic';
import { Cell } from './components/Cell';
import { getHintFromGemini } from './services/geminiService';

const App: React.FC = () => {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DifficultyLevel.BEGINNER);
  const [board, setBoard] = useState<Board>([]);
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [flags, setFlags] = useState(0);
  const [timer, setTimer] = useState(0);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  
  const timerRef = useRef<number | null>(null);
  const config = DIFFICULTIES[difficulty];

  // Explicitly set return type to Board to maintain optional properties as optional and avoid inference errors
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
      clearInterval(timerRef.current!);
    }
  }, [config]);

  const handleCellClick = (x: number, y: number) => {
    if (status === GameStatus.WON || status === GameStatus.LOST || board[x][y].isFlagged) return;

    // Explicitly type newBoard as Board to avoid incorrect inference of required optional fields
    let newBoard: Board = clearHints([...board.map(row => [...row])]);
    setHintMessage(null);

    if (status === GameStatus.IDLE) {
      setStatus(GameStatus.GENERATING);
      setTimeout(() => {
        newBoard = generateGuaranteedBoard(config.rows, config.cols, config.mines, x, y);
        floodFill(newBoard, x, y);
        setBoard(newBoard);
        setStatus(GameStatus.PLAYING);
        timerRef.current = window.setInterval(() => {
          setTimer(prev => prev + 1);
        }, 1000);
      }, 0);
      return;
    }

    if (newBoard[x][y].isMine) {
      newBoard[x][y].isRevealed = true;
      setStatus(GameStatus.LOST);
      clearInterval(timerRef.current!);
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

  const triggerHint = async () => {
    if (status !== GameStatus.PLAYING) return;
    
    const hint = findHint(board);
    if (hint) {
      const newBoard = [...board.map(row => [...row])];
      newBoard[hint.x][hint.y].isHinted = true;
      newBoard[hint.x][hint.y].hintType = hint.type;
      setBoard(newBoard);
      setHintMessage(hint.type === 'SAFE' ? "高亮处可以安全点击！" : "高亮处根据逻辑必然是雷，请插旗。");
    } else {
      // Fallback to Gemini AI for complex reasoning when simple logical rules aren't enough
      setHintMessage("正在分析局面中 (AI)...");
      try {
        const aiHint = await getHintFromGemini(board, config.mines - flags);
        setHintMessage(aiHint);
      } catch (error) {
        setHintMessage("当前局势需要尝试更多已知区域，或暂时没有简单逻辑结论。");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 mb-6 border border-slate-700 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-start gap-1">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Smart Minesweeper
            </h1>
            <p className="text-slate-400 text-sm font-medium">100% 逻辑可解 • 智能逻辑提示</p>
          </div>

          <div className="flex bg-slate-900/60 p-1.5 rounded-xl border border-slate-700/50">
            {(Object.keys(DIFFICULTIES) as DifficultyLevel[]).map(level => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`
                  px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200
                  ${difficulty === level 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                `}
              >
                {DIFFICULTIES[level].name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
             <div className="flex flex-col items-center min-w-[60px]">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Mines</span>
                <span className="text-xl font-mono text-orange-400 font-bold">{Math.max(0, config.mines - flags)}</span>
             </div>
             <div className="flex flex-col items-center min-w-[60px]">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Time</span>
                <span className="text-xl font-mono text-blue-400 font-bold">{timer}s</span>
             </div>
             <button 
                onClick={initGame}
                className="w-12 h-12 bg-slate-700 hover:bg-slate-600 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-slate-600"
             >
                <i className={`fa-solid ${status === GameStatus.WON ? 'fa-face-laugh-beam text-green-400' : status === GameStatus.LOST ? 'fa-face-sad-tear text-red-400' : 'fa-rotate-right text-white'}`}></i>
             </button>
          </div>
        </div>
      </div>

      <div className="relative group perspective-1000">
        {status === GameStatus.GENERATING && (
          <div className="absolute inset-0 z-10 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center rounded-xl animate-pulse">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-white font-bold tracking-widest uppercase text-xs">生成平衡棋盘中...</span>
            </div>
          </div>
        )}

        <div 
          className="bg-slate-800 p-2 md:p-4 rounded-xl shadow-2xl border-4 border-slate-700/80 overflow-auto max-h-[70vh] max-w-[95vw]"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${config.cols}, minmax(28px, 1fr))`,
            gap: '2px',
            width: 'fit-content'
          }}
        >
          {board.map((row, x) => 
            row.map((cell, y) => (
              <div key={`${x}-${y}`} className="w-7 h-7 md:w-9 md:h-9">
                <Cell 
                  data={cell} 
                  status={status}
                  onClick={() => handleCellClick(x, y)}
                  onContextMenu={(e) => handleRightClick(e, x, y)}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="w-full max-w-4xl mt-6 flex flex-col gap-4">
        {status === GameStatus.LOST && (
          <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl text-center text-red-300 font-bold animate-bounce">
            BOOM! 踩到地雷了。试试逻辑推演！
          </div>
        )}
        {status === GameStatus.WON && (
          <div className="bg-green-500/20 border border-green-500/50 p-4 rounded-xl text-center text-green-300 font-bold shadow-[0_0_20px_rgba(34,197,94,0.3)]">
            恭喜！完美拆除。
          </div>
        )}

        <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-xl flex items-center gap-4 transition-all">
          <button 
            onClick={triggerHint}
            disabled={status !== GameStatus.PLAYING}
            className={`
              flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all
              ${status === GameStatus.PLAYING 
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg active:scale-95' 
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
            `}
            title="获取逻辑提示"
          >
            <i className="fa-solid fa-lightbulb"></i>
          </button>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">逻辑推演助手</span>
            <p className="text-slate-300 text-sm leading-relaxed">
              {hintMessage || (status === GameStatus.IDLE ? "首点区域必然安全。遇到瓶颈时点击左侧灯泡获取逻辑提示。" : "观察已揭开的数字，运用逻辑排除地雷。")}
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-slate-600 text-[10px] uppercase tracking-[0.2em] font-medium flex gap-6">
        <span>左键: 揭开</span>
        <span>右键: 插旗</span>
        <span>SmartMines © 2024</span>
      </div>
    </div>
  );
};

export default App;
