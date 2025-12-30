
export enum DifficultyLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED'
}

export interface DifficultyConfig {
  rows: number;
  cols: number;
  mines: number;
  name: string;
}

export interface CellData {
  x: number;
  y: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborCount: number;
  isHinted?: boolean;
  hintType?: 'SAFE' | 'MINE' | null;
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  WON = 'WON',
  LOST = 'LOST',
  GENERATING = 'GENERATING'
}

export type Board = CellData[][];
