export type Line = { move: string; cp: number | null; mate: number | null; pv: string[] };
// Scores are always from White's point of view.
export type Analysis = { fen: string; depth: number; lines: Line[] };

const ENGINE_URL = '/stockfish/stockfish-19-lite-single.js';

export class Engine {
  private worker: Worker;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(options: Record<string, string | number> = {}) {
    this.worker = new Worker(ENGINE_URL);
    this.send('uci');
    for (const [k, v] of Object.entries(options)) this.send(`setoption name ${k} value ${v}`);
    this.send('isready');
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd);
  }

  // UCI forbids setoption during a search, so options go through the same queue as searches.
  setOption(name: string, value: string | number) {
    this.chain = this.chain.then(() => this.send(`setoption name ${name} value ${value}`));
  }

  analyze(fen: string, go: string, multipv = 1): Promise<Analysis> {
    const blackToMove = fen.split(' ')[1] === 'b';
    const task = this.chain.then(
      () =>
        new Promise<Analysis>((resolve) => {
          const lines = new Map<number, Line>();
          let depth = 0;
          this.worker.onmessage = (e: MessageEvent) => {
            const msg = String(e.data);
            if (msg.startsWith('info') && msg.includes(' pv ')) {
              const t = msg.split(' ');
              const at = (key: string) => t.indexOf(key);
              const idx = at('multipv') >= 0 ? Number(t[at('multipv') + 1]) : 1;
              depth = Number(t[at('depth') + 1]);
              const scoreType = t[at('score') + 1];
              const raw = Number(t[at('score') + 2]);
              const sign = blackToMove ? -1 : 1;
              const pv = t.slice(at('pv') + 1);
              lines.set(idx, {
                move: pv[0],
                cp: scoreType === 'cp' ? raw * sign : null,
                mate: scoreType === 'mate' ? raw * sign : null,
                pv,
              });
            } else if (msg.startsWith('bestmove')) {
              const best = msg.split(' ')[1];
              const sorted = [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, l]) => l);
              if (!sorted.length && best && best !== '(none)') {
                sorted.push({ move: best, cp: null, mate: null, pv: [best] });
              } else if (sorted.length && sorted[0].move !== best && best !== '(none)') {
                sorted.unshift({ ...sorted[0], move: best, pv: [best] });
              }
              resolve({ fen, depth, lines: sorted });
            }
          };
          this.send(`setoption name MultiPV value ${multipv}`);
          this.send(`position fen ${fen}`);
          this.send(go);
        }),
    );
    this.chain = task.catch(() => {});
    return task;
  }
}

export function winPct(line: Pick<Line, 'cp' | 'mate'> | undefined): number {
  if (!line) return 50;
  if (line.mate !== null) return line.mate > 0 ? 100 : line.mate < 0 ? 0 : 50;
  const cp = line.cp ?? 0;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

export function formatScore(line: Line | undefined): string {
  if (!line) return '…';
  if (line.mate !== null) return `M${line.mate}`;
  const v = (line.cp ?? 0) / 100;
  return (v > 0 ? '+' : '') + v.toFixed(1);
}
