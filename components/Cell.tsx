
import React from 'react';
import { CellData, GameStatus } from '../types';
import { COLORS } from '../constants';

interface CellProps {
  data: CellData;
  status: GameStatus;
  cellSize: number;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
}

export const Cell: React.FC<CellProps> = ({ data, status, cellSize, onClick, onContextMenu, onDoubleClick }) => {
  const { isRevealed, isFlagged, isMine, neighborCount, isHinted, hintType } = data;

  let content = null;
  let bgColor = 'bg-slate-700/50 hover:bg-slate-600/50 cursor-pointer shadow-inner';
  let textColor = '';
  let ringStyle = '';

  // 计算内部元素大小
  const fontSize = Math.max(cellSize * 0.5, 12);
  const iconSize = Math.max(cellSize * 0.45, 10);

  if (isHinted && !isRevealed) {
    if (hintType === 'SAFE') {
      ringStyle = 'ring-2 ring-emerald-400 ring-inset shadow-[0_0_15px_rgba(52,211,153,0.5)]';
    } else if (hintType === 'MINE') {
      ringStyle = 'ring-2 ring-orange-500 ring-inset shadow-[0_0_15px_rgba(249,115,22,0.5)]';
    }
  }

  if (isRevealed) {
    bgColor = 'bg-slate-900/40 cursor-default';
    if (isMine) {
      content = <i className="fa-solid fa-bomb text-red-500 animate-pulse" style={{ fontSize: `${iconSize}px` }}></i>;
      bgColor = 'bg-red-500/20';
    } else if (neighborCount > 0) {
      content = neighborCount;
      textColor = COLORS[neighborCount as keyof typeof COLORS] || 'text-white';
    }
  } else if (isFlagged) {
    content = <i className="fa-solid fa-flag text-orange-500" style={{ fontSize: `${iconSize}px` }}></i>;
  }

  if (status === GameStatus.LOST && isMine && !isRevealed) {
    content = <i className="fa-solid fa-bomb text-red-400 opacity-60" style={{ fontSize: `${iconSize}px` }}></i>;
  }

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      className={`
        mine-cell flex items-center justify-center 
        rounded-sm border border-slate-800/30 select-none
        ${bgColor} ${textColor} font-bold
        active:scale-95 active:bg-slate-500/50
        transition-all duration-75
        ${ringStyle}
      `}
      style={{
        width: `${cellSize}px`,
        height: `${cellSize}px`,
        fontSize: `${fontSize}px`
      }}
    >
      {content}
    </div>
  );
};
