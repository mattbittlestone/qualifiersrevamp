// Rules: L1 refresh = latest Euro QF; cascade to keep 8/team per league;
// then guarantee at least 1 up / 1 down per adjacent pair (except all-8 QF-in-L1 case).

export function buildLeaguesFromQF({ qf, prevLeagues, allTeams }) {
  // 1) Start next L1 = QF
  const L1 = [...qf];

  // helpers
  const set = arr => new Set(arr);
  const wasInL1 = new Set(prevLeagues.L1);
  const allNames = new Set(Object.keys(allTeams));
  // Fill missing team ratings pool by union of prev leagues + any in base ratings
  const pool = new Set([...allNames, ...Object.values(prevLeagues).flat()]);

  // 2) Identify movements caused directly by QF
  const stayedInL1 = prevLeagues.L1.filter(t => L1.includes(t));
  const relegatedFromL1 = prevLeagues.L1.filter(t => !L1.includes(t)); // pushed down to L2
  const leapfrogs = L1.filter(t => !wasInL1.has(t)); // came from outside L1

  // 3) Start from prev L2..L6, remove those who leapfrogged up
  let L2 = prevLeagues.L2.filter(t => !leapfrogs.includes(t)).concat(relegatedFromL1);
  let L3 = prevLeagues.L3.filter(t => !leapfrogs.includes(t));
  let L4 = prevLeagues.L4.filter(t => !leapfrogs.includes(t));
  let L5 = prevLeagues.L5.filter(t => !leapfrogs.includes(t));
  let L6 = prevLeagues.L6.filter(t => !leapfrogs.includes(t));

  // 4) Rebalance top-down so every league has exactly 8
  ({ upper: L2, lower: L3 } = rebalance(L2, L3));
  ({ upper: L3, lower: L4 } = rebalance(L3, L4));
  ({ upper: L4, lower: L5 } = rebalance(L4, L5));
  ({ upper: L5, lower: L6 } = rebalance(L5, L6));

  // 5) Guarantee at least 1 up / 1 down per pair (except when all 8 QF already in L1)
  const all8Stayed = stayedInL1.length === 8;
  if (!all8Stayed) ({ a:L1, b:L2 } = enforceOneUpOneDown(L1, L2));
  ({ a:L2, b:L3 } = enforceOneUpOneDown(L2, L3));
  ({ a:L3, b:L4 } = enforceOneUpOneDown(L3, L4));
  ({ a:L4, b:L5 } = enforceOneUpOneDown(L4, L5));
  ({ a:L5, b:L6 } = enforceOneUpOneDown(L5, L6));

  // 6) Final sanity: trim/pad from the global pool if oddities (shouldn’t happen normally)
  [L1,L2,L3,L4,L5,L6] = [L1,L2,L3,L4,L5,L6].map((league, idx) => {
    let out = league.slice(0,8);
    const needed = 8 - out.length;
    if (needed > 0) {
      const used = new Set([L1,L2,L3,L4,L5,L6].flat());
      for (const t of pool) {
        if (out.length === 8) break;
        if (!used.has(t)) out.push(t);
      }
    }
    return out;
  });

  return { L1, L2, L3, L4, L5, L6 };
}

function rebalance(upper, lower) {
  let U = upper.slice(), L = lower.slice();
  // If U > 8, push bottom teams to lower; if U < 8, pull top teams from lower
  while (U.length > 8) L.unshift(U.pop());
  while (U.length < 8 && L.length) U.push(L.shift());
  return { upper: U, lower: L };
}

function enforceOneUpOneDown(a, b) {
  let A = a.slice(), B = b.slice();
  if (!A.length || !B.length) return { a:A, b:B };
  // If no movement already guaranteed, force bottom of A down, top of B up.
  // We detect “no movement” heuristically by comparing with simple identity;
  // in this minimal prototype we always apply one swap to keep churn.
  const demote = A.pop();
  const promote = B.shift();
  A.push(promote);
  B.push(demote);
  return { a:A, b:B };
}

// Euro slots mapping per your example (24 teams total)
export function euroSlots(Leagues) {
  const out = { direct:[], playoffs:[], eliminated:[] };
  const add = (arr, xs) => xs.forEach(t => arr.push(t));

  const L1 = Leagues.L1, L2 = Leagues.L2, L3 = Leagues.L3, L4 = Leagues.L4, L5 = Leagues.L5, L6 = Leagues.L6;
  add(out.direct,   L1.slice(0,6));
  add(out.playoffs, L1.slice(6,8));

  add(out.direct,   L2.slice(0,3));
  add(out.playoffs, L2.slice(3,7));
  add(out.eliminated, L2.slice(7));

  add(out.direct,   L3.slice(0,2));
  add(out.playoffs, L3.slice(2,5));
  add(out.eliminated, L3.slice(5));

  add(out.direct,   L4.slice(0,1));
  add(out.playoffs, L4.slice(1,3));
  add(out.eliminated, L4.slice(3));

  add(out.playoffs, L5.slice(0,1));
  add(out.eliminated, L5.slice(1));

  add(out.eliminated, L6);

  return out;
}
