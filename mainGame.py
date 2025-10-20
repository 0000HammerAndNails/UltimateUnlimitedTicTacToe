import random
import math
import copy
from collections import defaultdict
from typing import List, Tuple, Optional

# Type aliases
Player = int  # 1 for X, -1 for O
Move = Tuple[int,int,int,int]  # (big_r, big_c, small_r, small_c)

def other(p: Player) -> Player:
    return -p

class SmallBoard:
    # cell values: 0 empty, 1 X, -1 O
    def __init__(self, N:int):
        self.N = N
        self.cells = [[0]*N for _ in range(N)]
        self.winner: Optional[Player] = None  # 1, -1, or 0 for tie, None for ongoing

    def clone(self):
        sb = SmallBoard(self.N)
        sb.cells = [row[:] for row in self.cells]
        sb.winner = self.winner
        return sb

    def is_full(self) -> bool:
        return all(self.cells[r][c] != 0 for r in range(self.N) for c in range(self.N))

    def apply_move(self, r:int, c:int, p:Player):
        if self.winner is not None:
            raise ValueError("Applying to finished small board")
        if self.cells[r][c] != 0:
            raise ValueError("Cell not empty")
        self.cells[r][c] = p
        self.update_winner()

    def update_winner(self):
        N = self.N
        # rows and cols
        for i in range(N):
            s = sum(self.cells[i][j] for j in range(N))
            if abs(s) == N:
                self.winner = 1 if s > 0 else -1
                return
            s = sum(self.cells[j][i] for j in range(N))
            if abs(s) == N:
                self.winner = 1 if s > 0 else -1
                return
        # diag
        s = sum(self.cells[i][i] for i in range(N))
        if abs(s) == N:
            self.winner = 1 if s > 0 else -1
            return
        s = sum(self.cells[i][N-1-i] for i in range(N))
        if abs(s) == N:
            self.winner = 1 if s > 0 else -1
            return
        # tie?
        if self.is_full():
            self.winner = 0  # tie

class UltimateTTT:
    def __init__(self, N:int=3):
        assert N >= 2, "N must be >=2"
        self.N = N
        self.boards: List[List[SmallBoard]] = [[SmallBoard(N) for _ in range(N)] for _ in range(N)]
        self.big_owner: List[List[Optional[Player]]] = [[None]*N for _ in range(N)]
        self.next_forced: Optional[Tuple[int,int]] = None  # which small-board (r,c) next player must play in, or None = anywhere
        self.current_player: Player = 1  # X starts
        self.winner: Optional[Player] = None  # None ongoing, 1/-1 win, 0 tie

    def clone(self):
        g = UltimateTTT(self.N)
        g.boards = [[self.boards[r][c].clone() for c in range(self.N)] for r in range(self.N)]
        g.big_owner = [[self.boards[r][c].winner for c in range(self.N)] for r in range(self.N)]
        g.next_forced = None if self.next_forced is None else (self.next_forced[0], self.next_forced[1])
        g.current_player = self.current_player
        g.winner = self.winner
        return g

    def small_is_available(self, br:int, bc:int):
        owner = self.boards[br][bc].winner
        return owner is None

    def legal_moves(self) -> List[Move]:
        moves = []
        if self.winner is not None:
            return moves
        if self.next_forced is None:
            # any empty cell in any available small board
            for br in range(self.N):
                for bc in range(self.N):
                    sb = self.boards[br][bc]
                    if sb.winner is None:
                        for sr in range(self.N):
                            for sc in range(self.N):
                                if sb.cells[sr][sc] == 0:
                                    moves.append((br,bc,sr,sc))
        else:
            br,bc = self.next_forced
            sb = self.boards[br][bc]
            if sb.winner is None:
                for sr in range(self.N):
                    for sc in range(self.N):
                        if sb.cells[sr][sc] == 0:
                            moves.append((br,bc,sr,sc))
            else:
                # forced board is finished -> anywhere
                self.next_forced = None
                return self.legal_moves()
        return moves

    def apply_move(self, mv:Move):
        if self.winner is not None:
            raise ValueError("Game already finished")
        br,bc,sr,sc = mv
        sb = self.boards[br][bc]
        if sb.cells[sr][sc] != 0 or sb.winner is not None:
            raise ValueError("Invalid move")
        sb.apply_move(sr,sc,self.current_player)
        # update big owner if small board now decided
        if sb.winner is not None:
            if sb.winner == 0:
                self.big_owner[br][bc] = 0
            else:
                self.big_owner[br][bc] = sb.winner
        # set next forced board based on (sr,sc)
        nb_r, nb_c = sr, sc
        if 0 <= nb_r < self.N and 0 <= nb_c < self.N and self.boards[nb_r][nb_c].winner is None:
            self.next_forced = (nb_r, nb_c)
        else:
            self.next_forced = None
        # switch player and check big winner
        self.current_player = other(self.current_player)
        self.update_big_winner()

    def update_big_winner(self):
        N = self.N
        # Create a grid values: 1,-1,0 or None
        grid = [[self.big_owner[r][c] if self.big_owner[r][c] is not None else None for c in range(N)] for r in range(N)]
        # For checking big wins, only consider cells owned by 1 or -1, ignore ties (0) and None.
        def line_winner(cells):
            s = 0
            count_none = 0
            for v in cells:
                if v is None or v == 0:
                    return None
                s += v
            if abs(s) == N:
                return 1 if s > 0 else -1
            return None
        # rows, cols
        for i in range(N):
            w = line_winner([grid[i][j] for j in range(N)])
            if w is not None:
                self.winner = w
                return
            w = line_winner([grid[j][i] for j in range(N)])
            if w is not None:
                self.winner = w
                return
        # diags
        w = line_winner([grid[i][i] for i in range(N)])
        if w is not None:
            self.winner = w
            return
        w = line_winner([grid[i][N-1-i] for i in range(N)])
        if w is not None:
            self.winner = w
            return
        # tie if all small boards decided (no None) and no big winner
        all_done = all(self.boards[r][c].winner is not None for r in range(N) for c in range(N))
        if all_done:
            self.winner = 0

    def is_terminal(self):
        return self.winner is not None

    def pretty_print(self):
        # Simple ASCII print of all boards
        N = self.N
        lines = []
        for br in range(N):
            for sr in range(N):
                row = []
                for bc in range(N):
                    sb = self.boards[br][bc]
                    row.append(''.join({1:'X',-1:'O',0:'.'}[sb.cells[sr][sc]] if sb.cells[sr][sc] != 0 else '.' for sc in range(N)))
                lines.append(' | '.join(row))
            if br != N-1:
                lines.append('-'*(N*(N)+3*(N-1)))
        print("\n".join(lines))
        if self.next_forced is None:
            print("Next: anywhere. Player:", 'X' if self.current_player==1 else 'O')
        else:
            print(f"Next forced small board: {self.next_forced}. Player: {'X' if self.current_player==1 else 'O'}")
        if self.winner is not None:
            if self.winner == 0:
                print("Game tied.")
            else:
                print("Winner:", 'X' if self.winner==1 else 'O')

# -------------------------
# MCTS Implementation
# -------------------------
class MCTSNode:
    def __init__(self, state:UltimateTTT, parent=None, move_from_parent:Optional[Move]=None):
        self.state = state
        self.parent = parent
        self.move_from_parent = move_from_parent
        self.children: List[MCTSNode] = []
        self._untried_moves = None
        self.wins = 0.0
        self.visits = 0

    @property
    def untried_moves(self):
        if self._untried_moves is None:
            self._untried_moves = self.state.legal_moves()
        return self._untried_moves

    def uct_select_child(self):
        # UCT formula
        best = None
        best_val = -1e9
        for c in self.children:
            if c.visits == 0:
                uct = float('inf')
            else:
                uct = (c.wins / c.visits) + 1.41421356237 * math.sqrt(math.log(self.visits) / c.visits)
            if uct > best_val:
                best_val = uct
                best = c
        return best

    def add_child(self, move:Move, state:UltimateTTT):
        node = MCTSNode(state, parent=self, move_from_parent=move)
        self.children.append(node)
        if move in self.untried_moves:
            self.untried_moves.remove(move)
        return node

    def update(self, result:float):
        self.visits += 1
        self.wins += result

def random_playout_result(state:UltimateTTT, for_player:Player) -> float:
    # returns 1.0 if for_player eventually wins, 0.0 for loss, 0.5 for tie
    st = state.clone()
    while not st.is_terminal():
        moves = st.legal_moves()
        if not moves:
            st.winner = 0
            break
        mv = random.choice(moves)
        st.apply_move(mv)
    if st.winner == for_player:
        return 1.0
    elif st.winner == 0:
        return 0.5
    else:
        return 0.0

def mcts(root_state:UltimateTTT, iter_limit:int=1000, verbose:bool=False) -> Optional[Move]:
    rootnode = MCTSNode(root_state.clone())
    for i in range(iter_limit):
        node = rootnode
        state = root_state.clone()
        # Selection
        while node.untried_moves == [] and node.children:
            node = node.uct_select_child()
            state.apply_move(node.move_from_parent)
        # Expansion
        if node.untried_moves:
            mv = random.choice(node.untried_moves)
            state.apply_move(mv)
            node = node.add_child(mv, state.clone())
        # Simulation
        result = random_playout_result(state, root_state.current_player)
        # Backpropagate (from node up to root)
        while node is not None:
            # result is from perspective of root_state.current_player when simulation started.
            # But node.state.current_player may differ; we keep wins recorded relative to root player.
            node.update(result)
            node = node.parent
    # choose most visited child
    best = None
    best_visits = -1
    for c in rootnode.children:
        if c.visits > best_visits:
            best_visits = c.visits
            best = c
    if best is None:
        return None
    return best.move_from_parent

# -------------------------
# CLI play helper
# -------------------------
def play_cli():
    print("Ultimate Tic-Tac-Toe (generalized).")
    N = int(input("Enter board density N (e.g. 3 for classic): ").strip())
    game = UltimateTTT(N)
    human_is = input("Do you want to play as X (first) or O (second)? [X/O]: ").strip().upper()
    human_player = 1 if human_is.startswith('X') else -1
    ai_iterations = int(input("AI MCTS iterations (try 400-2000): ").strip())
    print("Game start. Enter moves as: br bc sr sc (0-indexed).")
    while not game.is_terminal():
        game.pretty_print()
        if game.current_player == human_player:
            legal = game.legal_moves()
            print(f"Legal moves count: {len(legal)}")
            raw = input("Your move: ").strip()
            try:
                br,bc,sr,sc = map(int, raw.split())
                mv = (br,bc,sr,sc)
                if mv not in legal:
                    print("Illegal move. Try again.")
                    continue
                game.apply_move(mv)
            except Exception as e:
                print("Invalid input or move:", e)
                continue
        else:
            print("AI thinking...")
            mv = mcts(game, iter_limit=ai_iterations)
            if mv is None:
                print("AI found no move (draw?).")
                break
            print("AI plays:", mv)
            game.apply_move(mv)
    game.pretty_print()

if __name__ == "__main__":
    play_cli()
