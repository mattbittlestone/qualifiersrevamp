// Tiny Elo-ish simulator: double round-robin (14 matches), 3/1/0 points.

export function simulateAll(leagues, ratings, { homeAdv=60, drawBias=0.26, rndSeed=Date.now() } = {}) {
  const rnd = mulberry32(rndSeed >>> 0);
  const simLeague = league =>
    rank(doubleRoundRobin(league.map(name => ({ name, rating: ratings[name] ?? 1700 })), homeAdv, drawBias, rnd));
  return {
    L1: simLeague(leagues.L1),
    L2: simLeague(leagues.L2),
    L3: simLeague(leagues.L3),
    L4: simLeague(leagues.L4),
    L5: simLeague(leagues.L5),
    L6: simLeague(leagues.L6),
  };
}

function doubleRoundRobin(teams, homeAdv, drawBias, rnd) {
  const t = teams.map(x => ({...x, P:0,W:0,D:0,L:0,Pts:0}));
  for (let i=0;i<t.length;i++) {
    for (let j=i+1;j<t.length;j++) {
      playPair(t[i], t[j], homeAdv, drawBias, rnd);
    }
  }
  return t;
}

function playPair(a,b,homeAdv,drawBias,rnd) {
  playOne(a,b, homeAdv, drawBias, rnd); // A home
  playOne(b,a, homeAdv, drawBias, rnd); // B home
}

function playOne(home, away, homeAdv, drawBias, rnd) {
  const diff = (home.rating + homeAdv) - away.rating;
  const { pW, pD } = probs(diff, drawBias);
  const r = rnd();
  let res; // H/D/A
  if (r < pW) res = 'H';
  else if (r < pW + pD) res = 'D';
  else res = 'A';
  // update
  home.P++; away.P++;
  if (res === 'H') { home.W++; away.L++; home.Pts+=3; }
  if (res === 'A') { away.W++; home.L++; away.Pts+=3; }
  if (res === 'D') { home.D++; away.D++; home.Pts++; away.Pts++; }
}

function probs(eloDiff, drawBias) {
  const pNoDraw = 1/(1+Math.pow(10, -eloDiff/400));
  const pW = pNoDraw * (1 - drawBias);
  const pD = drawBias;
  return { pW, pD };
}

function rank(t) {
  return [...t].sort((a,b) => (b.Pts - a.Pts) || (b.W - a.W) || a.name.localeCompare(b.name));
}

// Small deterministic RNG for rerolls
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Finals: L1 #1 vs L3 #1, L1 #2 vs L2 #1 (neutral)
export function playFinals(sim, drawBias=0.2, seed=12345) {
  const rnd = mulberry32(seed);
  const s1 = neutral(sim.L1[0], sim.L3[0], drawBias, rnd);
  const s2 = neutral(sim.L1[1], sim.L2[0], drawBias, rnd);
  const winner = neutral(s1, s2, drawBias, rnd);
  return { semiA: [sim.L1[0].name, sim.L3[0].name, s1.name], semiB:[sim.L1[1].name, sim.L2[0].name, s2.name], champion: winner.name };
}

function neutral(a,b,drawBias,rnd) {
  const diff = (a.rating) - (b.rating);
  const { pW, pD } = probs(diff, drawBias);
  const r = rnd();
  if (r < pW) return a;
  if (r < pW + pD) return (rnd() < 0.5 ? a : b); // pens coinflip
  return b;
}
