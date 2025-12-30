
import { Board, CellData } from '../types';

/**
 * Basic Solvability Checker:
 * Simulates human-like logic (Simple Single-Cell Constraint)
 * Checks if the board can be fully solved without guessing.
 */
export function isSolvable(board: Board, startX: number, startY: number): boolean {
  const rows = board.length;
  const cols = board[0].length;
  const solved = board.map(row => row.map(cell => ({ 
    revealed: cell.isRevealed, 
    flagged: false 
  })));

  // Initial reveal from start
  const reveal = (x: number, y: number) => {
    if (x < 0 || x >= rows || y < 0 || y >= cols || solved[x][y].revealed) return;
    solved[x][y].revealed = true;
    if (board[x][y].neighborCount === 0) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          reveal(x + i, y + j);
        }
      }
    }
  };
  reveal(startX, startY);

  let progress = true;
  while (progress) {
    progress = false;

    // Standard Minesweeper logic rules
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!solved[r][c].revealed || board[r][c].neighborCount === 0) continue;

        const neighbors = [];
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const nr = r + i, nc = c + j;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && (i !== 0 || j !== 0)) {
              neighbors.push({ r: nr, c: nc });
            }
          }
        }

        const hidden = neighbors.filter(n => !solved[n.r][n.c].revealed);
        const flaggedCount = neighbors.filter(n => solved[n.r][n.c].flagged).length;
        const unflaggedHidden = hidden.filter(n => !solved[n.r][n.c].flagged);

        // Rule 1: If neighbor count == flags + unflagged hidden, all unflagged must be mines
        if (board[r][c].neighborCount === flaggedCount + unflaggedHidden.length && unflaggedHidden.length > 0) {
          unflaggedHidden.forEach(n => { solved[n.r][n.c].flagged = true; });
          progress = true;
        }

        // Rule 2: If neighbor count == flagged count, all unflagged hidden must be safe
        if (board[r][c].neighborCount === flaggedCount && unflaggedHidden.length > 0) {
          unflaggedHidden.forEach(n => reveal(n.r, n.c));
          progress = true;
        }
      }
    }
  }

  // Check if all non-mine cells are revealed
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!board[r][c].isMine && !solved[r][c].revealed) return false;
    }
  }
  return true;
}

export function createEmptyBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows }, (_, x) =>
    Array.from({ length: cols }, (_, y) => ({
      x, y, isMine: false, isRevealed: false, isFlagged: false, neighborCount: 0
    }))
  );
}

export function generateGuaranteedBoard(rows: number, cols: number, mines: number, startX: number, startY: number): Board {
  let attempts = 0;
  const maxAttempts = 500; // Reasonable limit for performance

  while (attempts < maxAttempts) {
    attempts++;
    const board = createEmptyBoard(rows, cols);
    
    // Randomly place mines avoiding start area (3x3 grid around start)
    let placed = 0;
    while (placed < mines) {
      const rx = Math.floor(Math.random() * rows);
      const ry = Math.floor(Math.random() * cols);
      
      const isNearStart = Math.abs(rx - startX) <= 1 && Math.abs(ry - startY) <= 1;
      if (!board[rx][ry].isMine && !isNearStart) {
        board[rx][ry].isMine = true;
        placed++;
      }
    }

    // Calculate neighbors
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].isMine) continue;
        let count = 0;
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const nr = r + i, nc = c + j;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine) count++;
          }
        }
        board[r][c].neighborCount = count;
      }
    }

    // Check solvability
    if (isSolvable(board, startX, startY)) {
      return board;
    }
  }
  
  // Fallback to a simple board if we can't find a 100% solvable one (unlikely with 500 attempts)
  return createEmptyBoard(rows, cols); 
}

export function floodFill(board: Board, x: number, y: number): void {
  const rows = board.length;
  const cols = board[0].length;

  if (x < 0 || x >= rows || y < 0 || y >= cols || board[x][y].isRevealed || board[x][y].isFlagged) return;

  board[x][y].isRevealed = true;

  if (board[x][y].neighborCount === 0) {
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        floodFill(board, x + i, y + j);
      }
    }
  }
}
