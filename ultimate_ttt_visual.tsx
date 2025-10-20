import React, { useState, useEffect } from 'react';
import { X, Circle, Zap, RotateCcw, Eye } from 'lucide-react';

const UltimateTicTacToe = () => {
  const [N, setN] = useState(3);
  const [game, setGame] = useState(null);
  const [zoomedBoard, setZoomedBoard] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [gameMode, setGameMode] = useState('menu'); // menu, playing
  const [humanPlayer, setHumanPlayer] = useState(1);
  const [aiIterations, setAiIterations] = useState(800);

  // Initialize game
  const initGame = (humanFirst, boardSize) => {
    const newGame = createGame(boardSize);
    setGame(newGame);
    setN(boardSize);
    setZoomedBoard(null);
    setHumanPlayer(humanFirst ? 1 : -1);
    setGameMode('playing');
    
    // If AI goes first
    if (!humanFirst) {
      setTimeout(() => aiMove(newGame, aiIterations), 500);
    }
  };

  const createGame = (n) => {
    return {
      N: n,
      boards: Array(n).fill(null).map(() => 
        Array(n).fill(null).map(() => createSmallBoard(n))
      ),
      bigOwner: Array(n).fill(null).map(() => Array(n).fill(null)),
      nextForced: null,
      currentPlayer: 1,
      winner: null
    };
  };

  const createSmallBoard = (n) => ({
    N: n,
    cells: Array(n).fill(null).map(() => Array(n).fill(0)),
    winner: null
  });

  const cloneGame = (g) => {
    return {
      N: g.N,
      boards: g.boards.map(row => row.map(sb => ({
        N: sb.N,
        cells: sb.cells.map(r => [...r]),
        winner: sb.winner
      }))),
      bigOwner: g.bigOwner.map(row => [...row]),
      nextForced: g.nextForced ? {...g.nextForced} : null,
      currentPlayer: g.currentPlayer,
      winner: g.winner
    };
  };

  const checkSmallBoardWinner = (board) => {
    const n = board.N;
    // Check rows and cols
    for (let i = 0; i < n; i++) {
      const rowSum = board.cells[i].reduce((a, b) => a + b, 0);
      if (Math.abs(rowSum) === n) return rowSum > 0 ? 1 : -1;
      
      const colSum = board.cells.reduce((sum, row) => sum + row[i], 0);
      if (Math.abs(colSum) === n) return colSum > 0 ? 1 : -1;
    }
    
    // Diagonals
    let diag1 = 0, diag2 = 0;
    for (let i = 0; i < n; i++) {
      diag1 += board.cells[i][i];
      diag2 += board.cells[i][n-1-i];
    }
    if (Math.abs(diag1) === n) return diag1 > 0 ? 1 : -1;
    if (Math.abs(diag2) === n) return diag2 > 0 ? 1 : -1;
    
    // Check tie
    const isFull = board.cells.every(row => row.every(cell => cell !== 0));
    if (isFull) return 0;
    
    return null;
  };

  const checkBigWinner = (g) => {
    const n = g.N;
    const grid = g.bigOwner;
    
    const checkLine = (cells) => {
      if (cells.some(v => v === null || v === 0)) return null;
      const sum = cells.reduce((a, b) => a + b, 0);
      if (Math.abs(sum) === n) return sum > 0 ? 1 : -1;
      return null;
    };
    
    // Rows and cols
    for (let i = 0; i < n; i++) {
      const w = checkLine(grid[i]);
      if (w !== null) return w;
      const col = grid.map(row => row[i]);
      const w2 = checkLine(col);
      if (w2 !== null) return w2;
    }
    
    // Diagonals
    const diag1 = grid.map((row, i) => row[i]);
    const w1 = checkLine(diag1);
    if (w1 !== null) return w1;
    
    const diag2 = grid.map((row, i) => row[n-1-i]);
    const w2 = checkLine(diag2);
    if (w2 !== null) return w2;
    
    // Check tie
    const allDone = g.boards.every(row => row.every(b => b.winner !== null));
    if (allDone) return 0;
    
    return null;
  };

  const getLegalMoves = (g) => {
    if (g.winner !== null) return [];
    
    const moves = [];
    if (g.nextForced === null) {
      for (let br = 0; br < g.N; br++) {
        for (let bc = 0; bc < g.N; bc++) {
          const sb = g.boards[br][bc];
          if (sb.winner === null) {
            for (let sr = 0; sr < g.N; sr++) {
              for (let sc = 0; sc < g.N; sc++) {
                if (sb.cells[sr][sc] === 0) {
                  moves.push({br, bc, sr, sc});
                }
              }
            }
          }
        }
      }
    } else {
      const {br, bc} = g.nextForced;
      const sb = g.boards[br][bc];
      if (sb.winner === null) {
        for (let sr = 0; sr < g.N; sr++) {
          for (let sc = 0; sc < g.N; sc++) {
            if (sb.cells[sr][sc] === 0) {
              moves.push({br, bc, sr, sc});
            }
          }
        }
      } else {
        // Forced board is finished, can play anywhere
        const newG = {...g, nextForced: null};
        return getLegalMoves(newG);
      }
    }
    return moves;
  };

  const applyMove = (g, move) => {
    const {br, bc, sr, sc} = move;
    const newGame = cloneGame(g);
    
    newGame.boards[br][bc].cells[sr][sc] = newGame.currentPlayer;
    
    const winner = checkSmallBoardWinner(newGame.boards[br][bc]);
    if (winner !== null) {
      newGame.boards[br][bc].winner = winner;
      newGame.bigOwner[br][bc] = winner;
    }
    
    // Set next forced board
    if (newGame.boards[sr][sc].winner === null) {
      newGame.nextForced = {br: sr, bc: sc};
    } else {
      newGame.nextForced = null;
    }
    
    newGame.currentPlayer = -newGame.currentPlayer;
    newGame.winner = checkBigWinner(newGame);
    
    return newGame;
  };

  const handleCellClick = (br, bc, sr, sc) => {
    if (!game || game.winner !== null || aiThinking) return;
    if (game.currentPlayer !== humanPlayer) return;
    
    const moves = getLegalMoves(game);
    const move = moves.find(m => m.br === br && m.bc === bc && m.sr === sr && m.sc === sc);
    
    if (move) {
      const newGame = applyMove(game, move);
      setGame(newGame);
      setZoomedBoard(null);
      
      if (newGame.winner === null) {
        setTimeout(() => aiMove(newGame, aiIterations), 300);
      }
    }
  };

  const aiMove = (currentGame, iterations) => {
    setAiThinking(true);
    
    setTimeout(() => {
      const move = runMCTS(currentGame, iterations);
      if (move) {
        const newGame = applyMove(currentGame, move);
        setGame(newGame);
        
        // Auto-zoom to the board where human must play
        if (newGame.nextForced && newGame.winner === null) {
          setZoomedBoard(newGame.nextForced);
        }
      }
      setAiThinking(false);
    }, 100);
  };

  const runMCTS = (rootState, iterLimit) => {
    const rootNode = {
      state: cloneGame(rootState),
      parent: null,
      move: null,
      children: [],
      untriedMoves: getLegalMoves(rootState),
      wins: 0,
      visits: 0
    };
    
    for (let i = 0; i < iterLimit; i++) {
      let node = rootNode;
      let state = cloneGame(rootState);
      
      // Selection
      while (node.untriedMoves.length === 0 && node.children.length > 0) {
        node = selectUCT(node);
        state = applyMove(state, node.move);
      }
      
      // Expansion
      if (node.untriedMoves.length > 0) {
        const move = node.untriedMoves[Math.floor(Math.random() * node.untriedMoves.length)];
        state = applyMove(state, move);
        const childNode = {
          state: cloneGame(state),
          parent: node,
          move: move,
          children: [],
          untriedMoves: getLegalMoves(state),
          wins: 0,
          visits: 0
        };
        node.children.push(childNode);
        node.untriedMoves = node.untriedMoves.filter(m => 
          !(m.br === move.br && m.bc === move.bc && m.sr === move.sr && m.sc === move.sc)
        );
        node = childNode;
      }
      
      // Simulation
      const result = randomPlayout(state, rootState.currentPlayer);
      
      // Backpropagation
      while (node !== null) {
        node.visits++;
        node.wins += result;
        node = node.parent;
      }
    }
    
    // Select best move
    let best = null;
    let bestVisits = -1;
    for (const child of rootNode.children) {
      if (child.visits > bestVisits) {
        bestVisits = child.visits;
        best = child;
      }
    }
    
    return best ? best.move : null;
  };

  const selectUCT = (node) => {
    let best = null;
    let bestValue = -Infinity;
    
    for (const child of node.children) {
      const uct = child.visits === 0 
        ? Infinity 
        : (child.wins / child.visits) + 1.41421356237 * Math.sqrt(Math.log(node.visits) / child.visits);
      
      if (uct > bestValue) {
        bestValue = uct;
        best = child;
      }
    }
    
    return best;
  };

  const randomPlayout = (state, forPlayer) => {
    let st = cloneGame(state);
    while (st.winner === null) {
      const moves = getLegalMoves(st);
      if (moves.length === 0) {
        st.winner = 0;
        break;
      }
      const move = moves[Math.floor(Math.random() * moves.length)];
      st = applyMove(st, move);
    }
    
    if (st.winner === forPlayer) return 1.0;
    if (st.winner === 0) return 0.5;
    return 0.0;
  };

  const renderCell = (value, isLegal, size = 'normal', n) => {
    const baseSize = size === 'large' ? 64 / n : 32 / n;
    const minSize = size === 'large' ? 12 : 6;
    const cellSize = Math.max(baseSize, minSize);
    const sizeClasses = size === 'large' ? `w-${Math.floor(cellSize)} h-${Math.floor(cellSize)}` : `w-${Math.floor(cellSize)} h-${Math.floor(cellSize)}`;
    const iconSize = size === 'large' ? Math.max(32, 64 / n) : Math.max(12, 32 / n);
    
    return (
      <div 
        className={`border-2 flex items-center justify-center transition-all ${
          isLegal ? 'border-blue-400 bg-blue-50 hover:bg-blue-100 cursor-pointer' : 'border-gray-300'
        }`}
        style={{ 
          width: size === 'large' ? `${Math.max(48, 200/n)}px` : `${Math.max(24, 80/n)}px`,
          height: size === 'large' ? `${Math.max(48, 200/n)}px` : `${Math.max(24, 80/n)}px`
        }}
      >
        {value === 1 && <X size={iconSize} className="text-blue-600 stroke-[3]" />}
        {value === -1 && <Circle size={iconSize} className="text-red-600 stroke-[3]" />}
      </div>
    );
  };

  const renderSmallBoard = (br, bc, size = 'normal') => {
    if (!game) return null;
    
    const board = game.boards[br][bc];
    const legalMoves = getLegalMoves(game);
    const isForced = game.nextForced && game.nextForced.br === br && game.nextForced.bc === bc;
    const n = game.N;
    
    if (board.winner !== null) {
      const boardSize = size === 'large' ? Math.max(200, 600/n) : Math.max(80, 260/n);
      const iconSize = size === 'large' ? Math.max(60, 200/n) : Math.max(30, 100/n);
      return (
        <div 
          className={`border-4 ${
            board.winner === 1 ? 'border-blue-600 bg-blue-100' :
            board.winner === -1 ? 'border-red-600 bg-red-100' :
            'border-gray-400 bg-gray-100'
          } flex items-center justify-center`}
          style={{ width: `${boardSize}px`, height: `${boardSize}px` }}
        >
          {board.winner === 1 && <X size={iconSize} className="text-blue-600 stroke-[4]" />}
          {board.winner === -1 && <Circle size={iconSize} className="text-red-600 stroke-[4]" />}
          {board.winner === 0 && <span className={`${size === 'large' ? 'text-2xl' : 'text-sm'} text-gray-600 font-bold`}>TIE</span>}
        </div>
      );
    }
    
    return (
      <div className={`border-4 ${isForced ? 'border-yellow-400 shadow-lg' : 'border-gray-500'} p-1 bg-white`}>
        <div className={`grid gap-0`} style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {board.cells.map((row, sr) => 
            row.map((cell, sc) => {
              const isLegal = legalMoves.some(m => m.br === br && m.bc === bc && m.sr === sr && m.sc === sc);
              return (
                <div 
                  key={`${sr}-${sc}`}
                  onClick={() => handleCellClick(br, bc, sr, sc)}
                >
                  {renderCell(cell, isLegal, size, n)}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  if (gameMode === 'menu') {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">Ultimate</h1>
          <h2 className="text-3xl font-bold text-center mb-6 text-gray-600">Tic-Tac-Toe</h2>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Board Size (N×N)
              </label>
              <input
                type="range"
                min="2"
                max="5"
                step="1"
                value={N}
                onChange={(e) => setN(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-lg font-semibold text-gray-800 mt-1">{N}×{N}</div>
              <div className="text-center text-xs text-gray-500">({N}×{N} boards, each with {N}×{N} cells)</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Strength (iterations)
              </label>
              <input
                type="range"
                min="200"
                max="2000"
                step="200"
                value={aiIterations}
                onChange={(e) => setAiIterations(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-sm text-gray-600 mt-1">{aiIterations}</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => initGame(true, N)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <X size={20} />
              Play as X (First)
            </button>
            <button
              onClick={() => initGame(false, N)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Circle size={20} />
              Play as O (Second)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Ultimate Tic-Tac-Toe ({N}×{N})</h1>
            <div className="text-sm text-gray-600 mt-1">
              {game && game.winner === null && (
                <>
                  Current Player: {game.currentPlayer === 1 ? 'X (Blue)' : 'O (Red)'}
                  {aiThinking && <span className="ml-2 text-purple-600 font-semibold">AI Thinking...</span>}
                </>
              )}
              {game && game.winner !== null && (
                <span className="font-bold text-lg">
                  {game.winner === 0 ? 'Game Tied!' : 
                   game.winner === 1 ? 'X (Blue) Wins!' : 'O (Red) Wins!'}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {zoomedBoard && (
              <button
                onClick={() => setZoomedBoard(null)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Eye size={18} />
                Show All
              </button>
            )}
            <button
              onClick={() => {
                setGameMode('menu');
                setGame(null);
                setZoomedBoard(null);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <RotateCcw size={18} />
              New Game
            </button>
          </div>
        </div>

        {/* Game Board */}
        {zoomedBoard ? (
          <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4 text-gray-700">
              Playing in Board ({zoomedBoard.br}, {zoomedBoard.bc})
            </h2>
            {renderSmallBoard(zoomedBoard.br, zoomedBoard.bc, 'large')}
            <p className="mt-4 text-sm text-gray-600">Click a cell to make your move</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 flex justify-center overflow-auto">
            <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
              {game && Array(N).fill(null).map((_, br) => 
                Array(N).fill(null).map((_, bc) => (
                  <div 
                    key={`${br}-${bc}`}
                    onClick={() => {
                      if (game.nextForced && game.nextForced.br === br && game.nextForced.bc === bc) {
                        setZoomedBoard({br, bc});
                      }
                    }}
                    className={game.nextForced && game.nextForced.br === br && game.nextForced.bc === bc ? 'cursor-pointer' : ''}
                  >
                    {renderSmallBoard(br, bc)}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-md p-4 mt-4">
          <h3 className="font-bold text-gray-800 mb-2">How to Play:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Win {N} small boards in a row (horizontal, vertical, or diagonal) to win the game</li>
            <li>• Each small board is a {N}×{N} tic-tac-toe grid</li>
            <li>• Your move determines which board your opponent plays in next</li>
            <li>• Yellow border = you must play in this board</li>
            <li>• Blue highlighted cells = legal moves</li>
            <li>• Click the highlighted board to zoom in when it's your turn</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UltimateTicTacToe;