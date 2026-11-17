export type Opening = { name: string; moves: string; idea: string };

export const OPENINGS: Opening[] = [
  { name: "King's Pawn", moves: 'e4', idea: 'Grab the center, open lines for the queen and the light-squared bishop.' },
  { name: "Queen's Pawn", moves: 'd4', idea: 'Take the center with a pawn that is already protected by the queen.' },
  { name: 'English', moves: 'c4', idea: 'Control d5 from the side; a flexible, positional start.' },
  { name: 'Réti', moves: 'Nf3', idea: 'Develop first and decide on the pawn structure later.' },
  { name: 'Open Game', moves: 'e4 e5', idea: 'Black mirrors and fights for the center symmetrically.' },
  { name: "King's Knight", moves: 'e4 e5 Nf3', idea: 'Develop with tempo by hitting e5.' },
  { name: 'Two Knights / Italian setup', moves: 'e4 e5 Nf3 Nc6', idea: 'Defend e5 with a developing move.' },
  { name: 'Italian Game', moves: 'e4 e5 Nf3 Nc6 Bc4', idea: 'Aim the bishop at f7, the weakest square near Black’s king.' },
  { name: 'Giuoco Piano', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5', idea: 'Black copies the bishop development. Plan c3 and d4 for a big center.' },
  { name: 'Giuoco Pianissimo', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3', idea: 'Prepare d4. Quiet but rich.' },
  { name: 'Two Knights Defense', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6', idea: 'Counterattack e4. Watch out for Ng5 hitting f7.' },
  { name: 'Fried Liver threat', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5', idea: 'White doubles up on f7. Black should play d5!' },
  { name: 'Two Knights, main line', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5', idea: 'Block the bishop. After exd5, play Na5 rather than Nxd5.' },
  { name: 'Ruy López', moves: 'e4 e5 Nf3 Nc6 Bb5', idea: 'Pressure the knight that defends e5.' },
  { name: 'Ruy López, Morphy Defense', moves: 'e4 e5 Nf3 Nc6 Bb5 a6', idea: 'Ask the bishop where it is going.' },
  { name: 'Ruy López, main line', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6', idea: 'Keep the pin tension; White usually castles next.' },
  { name: 'Scotch Game', moves: 'e4 e5 Nf3 Nc6 d4', idea: 'Open the center immediately.' },
  { name: 'Scotch, main line', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4', idea: 'White has a central knight; Black develops quickly with Nf6 or Bc5.' },
  { name: 'Petrov Defense', moves: 'e4 e5 Nf3 Nf6', idea: 'Counterattack e4 instead of defending e5. Solid.' },
  { name: 'Sicilian Defense', moves: 'e4 c5', idea: 'Fight for d4 with a flank pawn; imbalanced and sharp.' },
  { name: 'Open Sicilian', moves: 'e4 c5 Nf3 d6 d4', idea: 'Trade the d-pawn for the c-pawn and get a lead in development.' },
  { name: 'Open Sicilian, main line', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3', idea: 'Black now chooses: a6 (Najdorf) or g6 (Dragon).' },
  { name: 'Sicilian, Nc6 lines', moves: 'e4 c5 Nf3 Nc6', idea: 'Develop and keep options for e5 or g6.' },
  { name: 'Alapin Sicilian', moves: 'e4 c5 c3', idea: 'Prepare d4 so White can recapture with a pawn.' },
  { name: 'French Defense', moves: 'e4 e6', idea: 'Prepare d5. Solid, but the c8 bishop can get stuck.' },
  { name: 'French, main line', moves: 'e4 e6 d4 d5', idea: 'Challenge e4. White chooses Nc3, Nd2, or e5.' },
  { name: 'French Advance', moves: 'e4 e6 d4 d5 e5', idea: 'Grab space. Black hits the chain with c5.' },
  { name: 'French Advance, c5', moves: 'e4 e6 d4 d5 e5 c5', idea: 'Attack the base of the chain (d4), then add pressure with Nc6 and Qb6.' },
  { name: 'Caro-Kann', moves: 'e4 c6', idea: 'Prepare d5 while keeping the c8 bishop free.' },
  { name: 'Caro-Kann, main line', moves: 'e4 c6 d4 d5', idea: 'Challenge e4 right away.' },
  { name: 'Caro-Kann Classical', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5', idea: 'Develop the bishop outside the pawn chain before e6.' },
  { name: 'Scandinavian', moves: 'e4 d5', idea: 'Challenge e4 at once. The queen comes out early.' },
  { name: 'Scandinavian, main line', moves: 'e4 d5 exd5 Qxd5 Nc3', idea: 'White gains time by attacking the queen.' },
  { name: "Queen's Gambit", moves: 'd4 d5 c4', idea: 'Offer a wing pawn to deflect Black’s center pawn.' },
  { name: "Queen's Gambit Declined", moves: 'd4 d5 c4 e6', idea: 'Hold d5 solidly. Expect Nc3, Nf6, Bg5.' },
  { name: "Queen's Gambit Accepted", moves: 'd4 d5 c4 dxc4', idea: 'Black takes the pawn, but usually does not try to keep it. White plays e3 and Bxc4.' },
  { name: 'Slav Defense', moves: 'd4 d5 c4 c6', idea: 'Support d5 without blocking the c8 bishop.' },
  { name: 'London System', moves: 'd4 d5 Bf4', idea: 'Same setup every game: Bf4, e3, Nf3, c3, Bd3, Nbd2.' },
  { name: 'Indian Defense', moves: 'd4 Nf6', idea: 'Control e4 with a piece and decide on the pawns later.' },
  { name: "King's Indian Defense", moves: 'd4 Nf6 c4 g6', idea: 'Fianchetto, castle, and strike later with e5 or c5.' },
  { name: 'Nimzo-Indian', moves: 'd4 Nf6 c4 e6 Nc3 Bb4', idea: 'Pin the knight to stop e4; Black may give up the bishop pair.' },
  { name: "Queen's Indian", moves: 'd4 Nf6 c4 e6 Nf3 b6', idea: 'Fianchetto to control e4.' },
];

const byMoves = new Map(OPENINGS.map((o) => [o.moves, o]));

export function currentOpening(history: string[]): Opening | null {
  for (let n = history.length; n > 0; n--) {
    const o = byMoves.get(history.slice(0, n).join(' '));
    if (o) return o;
  }
  return null;
}

/** Book moves that extend the given history by one ply, with the deepest named line they lead to. */
export function bookMoves(history: string[]): { san: string; leadsTo: Opening }[] {
  const prefix = history.join(' ');
  const out = new Map<string, Opening>();
  for (const o of OPENINGS) {
    const m = o.moves.split(' ');
    if (m.length <= history.length) continue;
    if (m.slice(0, history.length).join(' ') !== prefix) continue;
    const next = m[history.length];
    const prev = out.get(next);
    if (!prev || prev.moves.split(' ').length > m.length) out.set(next, o);
  }
  return [...out.entries()].map(([san, leadsTo]) => ({ san, leadsTo }));
}
