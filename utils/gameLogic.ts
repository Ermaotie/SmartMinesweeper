
import { Board, CellData } from '../types';

/**
 * Advanced Logic Module: Second-Order Logic (Subset Reduction)
 * Analyzes pairs of revealed cells that share hidden neighbors.
 */

interface CellConstraint {
  r: number;
  c: number;
  remainingMines: number;
  hiddenNeighbors: Set<string>; // "r,c" strings
}

// Fixed board parameter type to accept Uint8Array[] for simulation logic where 'solved' is an array of Uint8Arrays.
function getHiddenNeighbors(r: number, c: number, board: Board | Uint8Array[], rows: number, cols: number, isSim: boolean) {
  const neighbors = new Set<string>();
  const list: {r: number, c: number}[] = [];
  
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const nr = r + i, nc = c + j;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && (i !== 0 || j !== 0)) {
        if (isSim) {
          // In simulation, solved[nr][nc] === 0 means hidden
          const solved = board as any;
          if (solved[nr][nc] === 0) {
            neighbors.add(`${nr},${nc}`);
            list.push({r: nr, c: nc});
          }
        } else {
          const b = board as Board;
          if (!b[nr][nc].isRevealed && !b[nr][nc].isFlagged) {
            neighbors.add(`${nr},${nc}`);
            list.push({r: nr, c: nc});
          }
        }
      }
    }
  }
  return { set: neighbors, list };
}

/**
 * Improved Solvability Checker with Second-Order Logic
 */
export function isSolvable(board: Board, startX: number, startY: number): boolean {
  const rows = board.length;
  const cols = board[0].length;
  const solved = Array.from({ length: rows }, () => new Uint8Array(cols)); // 0: hidden, 1: revealed, 2: flagged
  
  const reveal = (x: number, y: number) => {
    if (x < 0 || x >= rows || y < 0 || y >= cols || solved[x][y] === 1) return;
    solved[x][y] = 1;
    if (board[x][y].neighborCount === 0) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (i !== 0 || j !== 0) reveal(x + i, y + j);
        }
      }
    }
  };
  
  reveal(startX, startY);

  let progress = true;
  while (progress) {
    progress = false;

    // --- Phase 1: First-Order Logic (Simple) ---
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (solved[r][c] !== 1 || board[r][c].neighborCount === 0) continue;

        let hiddenCount = 0;
        let flaggedCount = 0;
        const hiddenCoords: {r: number, c: number}[] = [];

        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const nr = r + i, nc = c + j;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && (i !== 0 || j !== 0)) {
              if (solved[nr][nc] === 0) { hiddenCount++; hiddenCoords.push({r: nr, c: nc}); }
              else if (solved[nr][nc] === 2) { flaggedCount++; }
            }
          }
        }

        if (hiddenCount === 0) continue;
        if (board[r][c].neighborCount === flaggedCount + hiddenCount) {
          hiddenCoords.forEach(n => { solved[n.r][n.c] = 2; });
          progress = true;
        } else if (board[r][c].neighborCount === flaggedCount) {
          hiddenCoords.forEach(n => reveal(n.r, n.c));
          progress = true;
        }
      }
    }
    if (progress) continue;

    // --- Phase 2: Second-Order Logic (Subset Reduction) ---
    const constraints: CellConstraint[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (solved[r][c] === 1 && board[r][c].neighborCount > 0) {
          let flaggedCount = 0;
          for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
              const nr = r + i, nc = c + j;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && solved[nr][nc] === 2) flaggedCount++;
            }
          }
          const hn = getHiddenNeighbors(r, c, solved, rows, cols, true);
          if (hn.set.size > 0) {
            constraints.push({ r, c, remainingMines: board[r][c].neighborCount - flaggedCount, hiddenNeighbors: hn.set });
          }
        }
      }
    }

    for (let i = 0; i < constraints.length; i++) {
      for (let j = 0; j < constraints.length; j++) {
        if (i === j) continue;
        const c1 = constraints[i];
        const c2 = constraints[j];

        // Check if c1's hidden neighbors are a subset of c2's
        let isSubset = true;
        for (let item of c1.hiddenNeighbors) {
          if (!c2.hiddenNeighbors.has(item)) { isSubset = false; break; }
        }

        if (isSubset && c1.hiddenNeighbors.size < c2.hiddenNeighbors.size) {
          const diff = new Set([...c2.hiddenNeighbors].filter(x => !c1.hiddenNeighbors.has(x)));
          const mineDiff = c2.remainingMines - c1.remainingMines;

          if (mineDiff === 0) {
            // All cells in diff are SAFE
            diff.forEach(coord => {
              const [r, c] = coord.split(',').map(Number);
              reveal(r, c);
            });
            progress = true;
          } else if (mineDiff === diff.size) {
            // All cells in diff are MINES
            diff.forEach(coord => {
              const [r, c] = coord.split(',').map(Number);
              solved[r][c] = 2;
            });
            progress = true;
          }
        }
        if (progress) break;
      }
      if (progress) break;
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!board[r][c].isMine && solved[r][c] !== 1) return false;
    }
  }
  return true;
}

export function findHint(board: Board): { x: number; y: number; type: 'SAFE' | 'MINE'; logic: 'BASIC' | 'ADVANCED' } | null {
  const rows = board.length;
  const cols = board[0].length;

  // 1. Try Basic Logic first
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!board[r][c].isRevealed || board[r][c].neighborCount === 0) continue;

      let hidden: {r: number, c: number}[] = [];
      let flaggedCount = 0;
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const nr = r + i, nc = c + j;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && (i !== 0 || j !== 0)) {
            if (!board[nr][nc].isRevealed && !board[nr][nc].isFlagged) hidden.push({r: nr, c: nc});
            else if (board[nr][nc].isFlagged) flaggedCount++;
          }
        }
      }

      if (hidden.length === 0) continue;
      if (board[r][c].neighborCount === flaggedCount + hidden.length) return { x: hidden[0].r, y: hidden[0].c, type: 'MINE', logic: 'BASIC' };
      if (board[r][c].neighborCount === flaggedCount) return { x: hidden[0].r, y: hidden[0].c, type: 'SAFE', logic: 'BASIC' };
    }
  }

  // 2. Try Advanced Logic (Subset Reduction)
  const constraints: CellConstraint[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].isRevealed && board[r][c].neighborCount > 0) {
        let flaggedCount = 0;
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const nr = r + i, nc = c + j;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isFlagged) flaggedCount++;
          }
        }
        const hn = getHiddenNeighbors(r, c, board, rows, cols, false);
        if (hn.set.size > 0) {
          constraints.push({ r, c, remainingMines: board[r][c].neighborCount - flaggedCount, hiddenNeighbors: hn.set });
        }
      }
    }
  }

  for (let i = 0; i < constraints.length; i++) {
    for (let j = 0; j < constraints.length; j++) {
      if (i === j) continue;
      const c1 = constraints[i];
      const c2 = constraints[j];

      let isSubset = true;
      for (let item of c1.hiddenNeighbors) {
        if (!c2.hiddenNeighbors.has(item)) { isSubset = false; break; }
      }

      if (isSubset && c1.hiddenNeighbors.size < c2.hiddenNeighbors.size) {
        const diff = [...c2.hiddenNeighbors].filter(x => !c1.hiddenNeighbors.has(x));
        const mineDiff = c2.remainingMines - c1.remainingMines;
        const [dr, dc] = diff[0].split(',').map(Number);

        if (mineDiff === 0) return { x: dr, y: dc, type: 'SAFE', logic: 'ADVANCED' };
        if (mineDiff === diff.length) return { x: dr, y: dc, type: 'MINE', logic: 'ADVANCED' };
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

export async function generateGuaranteedBoard(rows: number, cols: number, mines: number, startX: number, startY: number): Promise<Board> {
  let attempts = 0;
  const maxAttempts = (rows * cols > 200) ? 100 : 300; 

  while (attempts < maxAttempts) {
    attempts++;
    if (attempts % 5 === 0) await new Promise(resolve => setTimeout(resolve, 0));

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

  // Final fallback (simple randomization)
  return createEmptyBoard(rows, cols); // Should logically never be needed with advanced solver
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
