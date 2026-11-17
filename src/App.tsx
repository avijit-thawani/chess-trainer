import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Engine, formatScore, winPct, type Analysis } from './engine';
import { bookMoves, currentOpening } from './openings';
import { steampunkPieces } from './pieces';

type Color = 'w' | 'b';
type Grade = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

type Settings = {
  playerColor: Color;
  skill: number; // Stockfish "Skill Level", 0–20
  liveHints: boolean; // always show best-move arrow on your turn
  blunderCheck: boolean; // pause after a mistake/blunder and offer an undo
  bookGuide: boolean; // show opening book moves and ideas
  showGrades: boolean; // grade your moves in the move list during play
  showEval: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  playerColor: 'w',
  skill: 5,
  liveHints: false,
  blunderCheck: true,
  bookGuide: true,
  showGrades: true,
  showEval: true,
};

const ANALYSIS_GO = 'go depth 12';
const GRADE_STYLE: Record<Grade, { label: string; cls: string; symbol: string }> = {
  best: { label: 'Best', cls: 'text-emerald-400', symbol: '★' },
  good: { label: 'Good', cls: 'text-[#c8b896]', symbol: '' },
  inaccuracy: { label: 'Inaccuracy', cls: 'text-yellow-400', symbol: '?!' },
  mistake: { label: 'Mistake', cls: 'text-orange-400', symbol: '?' },
  blunder: { label: 'Blunder', cls: 'text-red-500', symbol: '??' },
};
const HINT_ARROW = 'rgba(230, 168, 60, 0.9)' as const;

const BOARD_STYLE: Record<string, string | number> = {
  border: '10px solid #5a3d1e',
  borderRadius: 10,
  boxShadow: '0 0 40px rgba(0,0,0,0.7), inset 0 0 20px rgba(0,0,0,0.4)',
};
const LIGHT_SQUARE = {
  background: 'repeating-linear-gradient(45deg, #d3aa72, #d3aa72 6px, #cba269 6px, #cba269 12px)',
};
const DARK_SQUARE = {
  background: 'repeating-linear-gradient(45deg, #7a5230, #7a5230 6px, #6e4a2a 6px, #6e4a2a 12px)',
};

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? { ...fallback, ...JSON.parse(v) } : fallback;
  } catch {
    return fallback;
  }
}

function replay(moves: string[]) {
  const g = new Chess();
  const fens = [g.fen()];
  const uci: string[] = [];
  for (const san of moves) {
    const m = g.move(san);
    uci.push(m.from + m.to + (m.promotion ?? ''));
    fens.push(g.fen());
  }
  return { game: g, fens, uci };
}

function uciToSan(fen: string, uci: string): string | null {
  try {
    const g = new Chess(fen);
    return g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
  } catch {
    return null;
  }
}

/** Grade the move played from `before` to `after` by how much win probability the mover lost. */
function grade(before: Analysis | undefined, after: Analysis | undefined, mover: Color, playedUci: string) {
  if (!before?.lines.length || !after?.lines.length) return null;
  const sign = mover === 'w' ? 1 : -1;
  const pov = (p: number) => (sign === 1 ? p : 100 - p);
  const loss = pov(winPct(before.lines[0])) - pov(winPct(after.lines[0]));
  let g: Grade;
  if (playedUci === before.lines[0].move || loss < 2) g = 'best';
  else if (loss < 10) g = 'good';
  else if (loss < 20) g = 'inaccuracy';
  else if (loss < 30) g = 'mistake';
  else g = 'blunder';
  return { grade: g, loss };
}

type Banner = { title: string; sub: string; danger: boolean; sticky: boolean };

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => load('chess.settings', DEFAULT_SETTINGS));
  const [moves, setMoves] = useState<string[]>(() => load('chess.game', { moves: [] as string[] }).moves);
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({});
  const [paused, setPaused] = useState(false); // waiting on the player after a blunder alert
  const [checkedPly, setCheckedPly] = useState(-1); // last ply already run through the blunder check
  const [hintFen, setHintFen] = useState<string | null>(null); // one-off hint requested for this position
  const [reviewPly, setReviewPly] = useState<number | null>(null); // non-null = review mode
  const [engineThinking, setEngineThinking] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);

  const analyst = useRef<Engine>(null);
  const opponent = useRef<Engine>(null);
  const requested = useRef(new Set<string>());
  const gen = useRef(0);
  const bannerTimer = useRef<number>(0);

  useEffect(() => {
    analyst.current = new Engine({ Threads: 1, Hash: 32 });
    opponent.current = new Engine({ Threads: 1, Hash: 16, 'Skill Level': settings.skill });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    opponent.current?.setOption('Skill Level', settings.skill);
    localStorage.setItem('chess.settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => localStorage.setItem('chess.game', JSON.stringify({ moves })), [moves]);

  const { game, fens, uci } = useMemo(() => replay(moves), [moves]);
  const ply = moves.length;
  const viewPly = reviewPly ?? ply;
  const viewFen = fens[viewPly];
  const turn = game.turn();
  const myTurn = turn === settings.playerColor;
  const over = game.isGameOver();
  const inCheck = game.inCheck();

  const requestAnalysis = (fen: string) => {
    if (requested.current.has(fen) || !analyst.current) return;
    requested.current.add(fen);
    analyst.current.analyze(fen, ANALYSIS_GO, 3).then((a) => setAnalyses((prev) => ({ ...prev, [fen]: a })));
  };

  // Keep the current and previous positions analyzed so hints and grades are ready.
  useEffect(() => {
    requestAnalysis(viewFen);
    if (viewPly > 0) requestAnalysis(fens[viewPly - 1]);
  });

  const grades = useMemo(
    () =>
      moves.map((_, i) => grade(analyses[fens[i]], analyses[fens[i + 1]], i % 2 === 0 ? 'w' : 'b', uci[i])),
    [moves, analyses, fens, uci],
  );

  const lastWasMine = ply > 0 && (ply - 1) % 2 === (settings.playerColor === 'w' ? 0 : 1);
  const lastGrade = lastWasMine ? grades[ply - 1] : null;

  // Blunder check: after your move, wait for its grade before letting the engine reply.
  const awaitingCheck = settings.blunderCheck && lastWasMine && checkedPly < ply - 1 && !over;
  useEffect(() => {
    if (!awaitingCheck || !lastGrade) return;
    setCheckedPly(ply - 1);
    if (lastGrade.grade === 'mistake' || lastGrade.grade === 'blunder') setPaused(true);
  }, [awaitingCheck, lastGrade, ply]);

  // Event banners: pronounce check, checkmate and draws the moment they happen.
  useEffect(() => {
    if (over) {
      if (game.isCheckmate()) {
        const youWin = turn !== settings.playerColor;
        setBanner({
          title: 'CHECKMATE',
          sub: youWin ? 'The machine falls. Victory is yours.' : 'Your king has fallen. Undo to retry, or start anew.',
          danger: !youWin,
          sticky: true,
        });
      } else {
        setBanner({ title: 'STALEMATE', sub: 'No moves remain — the gears grind to a halt.', danger: false, sticky: true });
      }
      return;
    }
    if (ply === 0 || !inCheck) return;
    // Announce only the move that delivered check, then fade out.
    window.clearTimeout(bannerTimer.current);
    setBanner({ title: 'CHECK', sub: 'Your king is under fire.', danger: true, sticky: false });
    bannerTimer.current = window.setTimeout(() => setBanner(null), 2200);
    return () => window.clearTimeout(bannerTimer.current);
  }, [over, inCheck, ply, game, turn, settings.playerColor]);

  // Engine reply.
  useEffect(() => {
    if (myTurn || over || paused || reviewPly !== null || awaitingCheck || !opponent.current) return;
    const myGen = ++gen.current;
    const fen = fens[ply];
    const book = bookMoves(moves);
    setEngineThinking(true);
    const pick: Promise<string | null> =
      book.length && settings.skill < 20
        ? new Promise((r) => setTimeout(() => r(book[Math.floor(Math.random() * book.length)].san), 400))
        : opponent.current
            .analyze(fen, `go movetime ${300 + settings.skill * 40}`)
            .then((a) => (a.lines[0] ? uciToSan(fen, a.lines[0].move) : null));
    pick.then((san) => {
      if (gen.current !== myGen) return;
      setEngineThinking(false);
      if (san) setMoves((m) => [...m, san]);
    });
  }, [myTurn, over, paused, reviewPly, awaitingCheck, fens, ply, moves, settings.skill]);

  const cancelEngine = () => {
    gen.current++;
    setEngineThinking(false);
  };

  const onDrop = (from: Square, to: Square, piece: string) => {
    if (reviewPly !== null || !myTurn || paused || over) return false;
    const g = new Chess(fens[ply]);
    try {
      const promotion = piece[1]?.toLowerCase();
      const m = g.move({ from, to, promotion: ['q', 'r', 'b', 'n'].includes(promotion) ? promotion : 'q' });
      setMoves([...moves, m.san]);
      setHintFen(null);
      return true;
    } catch {
      return false;
    }
  };

  const undo = () => {
    cancelEngine();
    setPaused(false);
    setHintFen(null);
    setBanner(null);
    setMoves((m) => {
      // Take back to the start of your most recent turn.
      let n = m.length - 1;
      const mine = settings.playerColor === 'w' ? 0 : 1;
      while (n > 0 && n % 2 !== mine) n--;
      const next = m.slice(0, Math.max(0, n));
      setCheckedPly(next.length - 1);
      return next;
    });
  };

  const newGame = (color: Color = settings.playerColor) => {
    cancelEngine();
    setSettings((s) => ({ ...s, playerColor: color }));
    setMoves([]);
    setPaused(false);
    setCheckedPly(-1);
    setReviewPly(null);
    setHintFen(null);
    setBanner(null);
  };

  const startReview = () => {
    cancelEngine();
    fens.forEach(requestAnalysis);
    setReviewPly(ply);
  };

  // Arrow keys step through the game in review mode.
  useEffect(() => {
    if (reviewPly === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setReviewPly((p) => Math.max(0, (p ?? 0) - 1));
      if (e.key === 'ArrowRight') setReviewPly((p) => Math.min(ply, (p ?? 0) + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reviewPly, ply]);

  const viewAnalysis = analyses[viewFen];
  const showHint = reviewPly !== null || (myTurn && (settings.liveHints || hintFen === viewFen));
  const arrows: [Square, Square, string][] = [];
  if (paused && analyses[fens[ply - 1]]?.lines[0]) {
    const b = analyses[fens[ply - 1]].lines[0].move;
    arrows.push([b.slice(0, 2) as Square, b.slice(2, 4) as Square, HINT_ARROW]);
  } else if (showHint && viewAnalysis?.lines[0]) {
    const b = viewAnalysis.lines[0].move;
    arrows.push([b.slice(0, 2) as Square, b.slice(2, 4) as Square, HINT_ARROW]);
  }

  const lastMoveStyles: Record<string, Record<string, string | number>> = {};
  if (viewPly > 0) {
    const u = uci[viewPly - 1];
    lastMoveStyles[u.slice(0, 2)] = lastMoveStyles[u.slice(2, 4)] = { background: 'rgba(250,204,21,0.35)' };
  }
  // Pulsing red glow on the king's square while in check (current position only).
  if (inCheck && viewPly === ply) {
    for (const row of game.board()) {
      for (const sq of row) {
        if (sq && sq.type === 'k' && sq.color === turn) {
          lastMoveStyles[sq.square] = {
            background: 'radial-gradient(circle, rgba(230,50,30,0.55), rgba(230,50,30,0.1) 75%)',
            animation: 'check-pulse 0.9s ease-in-out infinite',
          };
        }
      }
    }
  }

  const opening = currentOpening(moves.slice(0, viewPly));
  const book = bookMoves(moves.slice(0, viewPly));
  const evalWhite = winPct(viewAnalysis?.lines[0]);

  const status = over
    ? game.isCheckmate()
      ? turn === settings.playerColor
        ? '☠ Checkmate — you lost'
        : '⚙ Checkmate — you won!'
      : '½ Draw'
    : paused
      ? '⚙ Paused: check your last move'
      : engineThinking
        ? '⚙ The engine is thinking…'
        : myTurn
          ? '⚙ Your move'
          : '…';

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings((s) => ({ ...s, [k]: v }));
  const showGrades = reviewPly !== null || settings.showGrades;

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-6xl flex flex-col lg:flex-row gap-6">
        <div className="flex gap-2 items-stretch">
          {(settings.showEval || reviewPly !== null) && (
            <div
              className="w-4 rounded overflow-hidden flex flex-col border border-[#5a3d1e]"
              title={formatScore(viewAnalysis?.lines[0])}
            >
              <div className="bg-[#2a1d10] transition-all duration-500" style={{ height: `${100 - evalWhite}%` }} />
              <div className="bg-gradient-to-b from-[#f7e2ae] to-[#b98c3e] flex-1 transition-all duration-500" />
            </div>
          )}
          <div className="w-[min(90vw,560px)] board-wrap relative">
            <Chessboard
              id="main"
              position={viewFen}
              onPieceDrop={onDrop}
              boardOrientation={settings.playerColor === 'w' ? 'white' : 'black'}
              customArrows={arrows}
              customSquareStyles={lastMoveStyles}
              customPieces={steampunkPieces}
              customBoardStyle={BOARD_STYLE}
              customLightSquareStyle={LIGHT_SQUARE}
              customDarkSquareStyle={DARK_SQUARE}
              animationDuration={220}
              arePiecesDraggable={reviewPly === null && myTurn && !paused && !over}
            />
            {banner && (
              <div className="banner">
                <div className={`banner-content ${banner.danger ? 'danger' : ''}`}>
                  <div className="banner-title text-[#f0e2c8]">{banner.title}</div>
                  <div className="banner-sub">{banner.sub}</div>
                </div>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between text-sm display-font tracking-wide">
              <span className="font-semibold">{reviewPly !== null ? `Reviewing move ${viewPly}/${ply}` : status}</span>
              {settings.showEval || reviewPly !== null ? (
                <span className="font-mono">{formatScore(viewAnalysis?.lines[0])}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <h1 className="display-font text-2xl font-extrabold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-[#f7e2ae] to-[#b98c3e]">
            ⚙ CHESS TRAINER ⚙
          </h1>

          {paused && lastGrade && (
            <div className="rounded-lg border border-red-500/60 bg-red-950/40 p-3">
              <div className={`font-semibold ${GRADE_STYLE[lastGrade.grade].cls}`}>
                {GRADE_STYLE[lastGrade.grade].label}: {moves[ply - 1]} gives away about {Math.round(lastGrade.loss)}% win
                chance.
              </div>
              <div className="text-sm mt-1 text-[#e2cf9f]">
                Better was <b>{uciToSan(fens[ply - 1], analyses[fens[ply - 1]].lines[0].move)}</b> (brass arrow). The
                engine's best reply would be{' '}
                <b>{analyses[fens[ply]]?.lines[0] ? uciToSan(fens[ply], analyses[fens[ply]].lines[0].move) : '…'}</b>.
              </div>
              <div className="mt-2 flex gap-2">
                <button className="btn" onClick={undo}>
                  Undo and try again
                </button>
                <button className="btn" onClick={() => setPaused(false)}>
                  Play on
                </button>
              </div>
            </div>
          )}

          {settings.bookGuide && (opening || book.length > 0) && (
            <div className="panel">
              {opening && (
                <div>
                  <span className="font-semibold display-font tracking-wide">{opening.name}</span>
                  <span className="text-[#bfa878]"> — {opening.idea}</span>
                </div>
              )}
              {book.length > 0 ? (
                <div className="mt-1 text-[#e2cf9f]">
                  Book moves:{' '}
                  {book.map((b) => (
                    <span key={b.san} className="mr-3" title={b.leadsTo.idea}>
                      <b>{b.san}</b> <span className="text-[#8a6f45]">({b.leadsTo.name})</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {showHint && viewAnalysis && (
            <div className="panel font-mono">
              <div className="text-[#bfa878] font-sans mb-1 display-font tracking-wide">
                Engine lines — depth {viewAnalysis.depth}
              </div>
              {viewAnalysis.lines.map((l, i) => {
                const g = new Chess(viewFen);
                const sans: string[] = [];
                for (const u of l.pv.slice(0, 6)) {
                  try {
                    sans.push(g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
                  } catch {
                    break;
                  }
                }
                return (
                  <div key={i}>
                    <span className="inline-block w-14">{formatScore(l)}</span> {sans.join(' ')}
                  </div>
                );
              })}
            </div>
          )}

          <div className="panel max-h-64 overflow-y-auto">
            <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-y-0.5">
              {Array.from({ length: Math.ceil(ply / 2) }, (_, r) => (
                <div key={r} className="contents">
                  <span className="text-[#8a6f45]">{r + 1}.</span>
                  {[2 * r, 2 * r + 1].map((i) =>
                    i < ply ? (
                      <button
                        key={i}
                        onClick={() => reviewPly !== null && setReviewPly(i + 1)}
                        className={`text-left px-1 rounded ${viewPly === i + 1 && reviewPly !== null ? 'bg-[#5a3d1e]' : ''}`}
                      >
                        {moves[i]}
                        {showGrades && grades[i] && (
                          <span className={`ml-1 ${GRADE_STYLE[grades[i]!.grade].cls}`}>
                            {GRADE_STYLE[grades[i]!.grade].symbol}
                          </span>
                        )}
                      </button>
                    ) : (
                      <span key={i} />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {reviewPly === null ? (
              <>
                <button className="btn" onClick={undo} disabled={ply === 0}>
                  ⟲ Undo
                </button>
                <button className="btn" onClick={() => setHintFen(viewFen)} disabled={!myTurn || over}>
                  ☝ Hint
                </button>
                <button className="btn" onClick={startReview} disabled={ply === 0}>
                  ⚙ Review game
                </button>
                <button className="btn" onClick={() => newGame('w')}>
                  New game (White)
                </button>
                <button className="btn" onClick={() => newGame('b')}>
                  New game (Black)
                </button>
              </>
            ) : (
              <>
                <button className="btn" onClick={() => setReviewPly(0)}>⏮</button>
                <button className="btn" onClick={() => setReviewPly(Math.max(0, viewPly - 1))}>◀</button>
                <button className="btn" onClick={() => setReviewPly(Math.min(ply, viewPly + 1))}>▶</button>
                <button className="btn" onClick={() => setReviewPly(ply)}>⏭</button>
                <button
                  className="btn"
                  onClick={() => {
                    // Continue playing from the reviewed position.
                    setMoves(moves.slice(0, viewPly));
                    setCheckedPly(viewPly - 1);
                    setReviewPly(null);
                  }}
                >
                  Play from here
                </button>
                <button className="btn" onClick={() => setReviewPly(null)}>
                  Back to game
                </button>
              </>
            )}
          </div>
          {reviewPly !== null && viewPly > 0 && grades[viewPly - 1] && (
            <div className="text-sm">
              {moves[viewPly - 1]} was{' '}
              <span className={GRADE_STYLE[grades[viewPly - 1]!.grade].cls}>
                {GRADE_STYLE[grades[viewPly - 1]!.grade].label.toLowerCase()}
              </span>
              {grades[viewPly - 1]!.grade !== 'best' && analyses[fens[viewPly - 1]]?.lines[0] && (
                <> — best was {uciToSan(fens[viewPly - 1], analyses[fens[viewPly - 1]].lines[0].move)}</>
              )}
            </div>
          )}

          <details className="panel" open>
            <summary className="cursor-pointer font-semibold display-font tracking-wide">Learning settings</summary>
            <div className="mt-2 grid gap-2">
              <label className="flex items-center gap-2">
                Opponent strength
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={settings.skill}
                  onChange={(e) => set('skill', Number(e.target.value))}
                />
                <span className="font-mono w-6">{settings.skill}</span>
              </label>
              {(
                [
                  ['blunderCheck', 'Stop me after a mistake or blunder (offers undo)'],
                  ['liveHints', 'Always show best move on my turn'],
                  ['bookGuide', 'Opening guide (book moves + ideas)'],
                  ['showGrades', 'Grade my moves while playing'],
                  ['showEval', 'Show eval bar while playing'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" checked={settings[k]} onChange={(e) => set(k, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
