
import React from 'react';
import { CellData, GameStatus } from '../types';
import { COLORS } from '../constants';

interface CellProps {
  data: CellData;
  status: GameStatus;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export const Cell: React.FC<CellProps> = ({ data, status, onClick, onContextMenu }) => {
  const { isRevealed, isFlagged, isMine, neighborCount } = data;

  let content = null;
  let bgColor = 'bg-slate-700/50 hover:bg-slate-600/50 cursor-pointer shadow-inner';
  let textColor = '';

  if (isRevealed) {
    bgColor = 'bg-slate-900/40 cursor-default';
    if (isMine) {
      content = <i className="fa-solid fa-bomb text-red-500 animate-pulse text-xs md:text-sm"></i>;
      bgColor = 'bg-red-500/20';
    } else if (neighborCount > 0) {
      content = neighborCount;
      textColor = COLORS[neighborCount as keyof typeof COLORS] || 'text-white';
    }
  } else if (isFlagged) {
    content = <i className="fa-solid fa-flag text-orange-500 text-xs md:text-sm"></i>;
  }

  // Visual cues for game end
  if (status === GameStatus.LOST && isMine && !isRevealed) {
    content = <i className="fa-solid fa-bomb text-red-400 opacity-60 text-xs md:text-sm"></i>;
  }

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`
        mine-cell w-full h-full flex items-center justify-center 
        rounded-sm border border-slate-800/50 select-none
        ${bgColor} ${textColor} font-bold text-sm md:text-base
        active:scale-95 active:bg-slate-500/50
        transition-transform duration-75
      `}
    >
      {content}
    </div>
  );
};
