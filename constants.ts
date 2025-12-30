
import { DifficultyLevel, DifficultyConfig } from './types';

export const DIFFICULTIES: Record<DifficultyLevel, DifficultyConfig> = {
  [DifficultyLevel.BEGINNER]: {
    name: '初级',
    rows: 9,
    cols: 9,
    mines: 10
  },
  [DifficultyLevel.INTERMEDIATE]: {
    name: '中级',
    rows: 16,
    cols: 16,
    mines: 40
  },
  [DifficultyLevel.ADVANCED]: {
    name: '高级',
    rows: 16,
    cols: 30,
    mines: 99
  }
};

export const COLORS = {
  1: 'text-blue-400',
  2: 'text-green-400',
  3: 'text-red-400',
  4: 'text-purple-400',
  5: 'text-yellow-500',
  6: 'text-cyan-400',
  7: 'text-pink-400',
  8: 'text-gray-400'
};
