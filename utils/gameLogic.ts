
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

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!solved[r][c].revealed || board[r][c].neighborCount === 0) continue;

        const neighbors = getNeighbors(r, c, rows, cols);
        const hidden = neighbors.filter(n => !solved[n.r][n.c].revealed);
        const flaggedCount = neighbors.filter(n => solved[n.r][n.c].flagged).length;
        const unflaggedHidden = hidden.filter(n => !solved[n.r][n.c].flagged);

        if (board[r][c].neighborCount === flaggedCount + unflaggedHidden.length && unflaggedHidden.length > 0) {
          unflaggedHidden.forEach(n => { solved[n.r][n.c].flagged = true; });
          progress = true;
        }

        if (board[r][c].neighborCount === flaggedCount && unflaggedHidden.length > 0) {
          unflaggedHidden.forEach(n => reveal(n.r, n.c));
          progress = true;
        }
      }
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!board[r][c].isMine && !solved[r][c].revealed) return false;
    }
  }
  return true;
}

function getNeighbors(r: number, c: number, rows: number, cols: number) {
  const neighbors = [];
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const nr = r + i, nc = c + j;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && (i !== 0 || j !== 0)) {
        neighbors.push({ r: nr, c: nc });
      }
    }
  }
  return neighbors;
}

/**
 * Finds the first logical move available on the current board.
 */
export function findHint(board: Board): { x: number; y: number; type: 'SAFE' | 'MINE' } | null {
  const rows = board.length;
  const cols = board[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!board[r][c].isRevealed || board[r][c].neighborCount === 0) continue;

      const neighbors = getNeighbors(r, c, rows, cols);
      const hidden = neighbors.filter(n => !board[n.r][n.c].isRevealed);
      const flaggedCount = neighbors.filter(n => board[n.r][n.c].isFlagged).length;
      const unflaggedHidden = hidden.filter(n => !board[n.r][n.c].isFlagged);

      if (unflaggedHidden.length === 0) continue;

      // Rule 1: All unflagged hidden must be mines
      if (board[r][c].neighborCount === flaggedCount + unflaggedHidden.length) {
        return { x: unflaggedHidden[0].r, y: unflaggedHidden[0].c, type: 'MINE' };
      }

      // Rule 2: All unflagged hidden must be safe
      if (board[r][c].neighborCount === flaggedCount) {
        return { x: unflaggedHidden[0].r, y: unflaggedHidden[0].c, type: 'SAFE' };
      }
    }
  }
  return null;
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
  const maxAttempts = 500;

  while (attempts < maxAttempts) {
    attempts++;
    const board = createEmptyBoard(rows, cols);
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

    if (isSolvable(board, startX, startY)) return board;
  }
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
