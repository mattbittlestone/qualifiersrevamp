import { BASE_RATINGS, DEFAULT_PREV_LEAGUES } from './data.js';
import { buildLeaguesFromQF, euroSlots } from './rules.js';
import { simulateAll, playFinals } from './sim.js';

const qfInput   = document.getElementById('qfInput');
const prevInput = document.getElementById('prevInput');
const buildBtn  = document.getElementById('buildBtn');
const runBtn    = document.getElementById('runBtn');
const resetBtn  = document.getElementById('resetBtn');
const leaguesView = document.getElementById('leaguesView');
const resultsDiv  = document.getElementById('results');
const homeAdvEl   = document.getElementById('homeAdv');
const drawBiasEl  = document.getElementById('drawBias');
const rerollBtn   = document.getElementById('rerollBtn');

let currentLeagues = null;
let lastSeed = Date.now();

qfInput.value = [
  "Portugal","Poland","Wales","Belgium","Germany","Italy","France","Iceland" // Euro 2016 QF
].join('\n');

buildBtn.addEventListener('click', () => {
  const qf = qfInput.value.split('\n').map(s => s.trim()).filter(Boolean);
  if (qf.length !== 8) {
    alert('Please provide exactly 8 quarter-finalists (one per line).');
    return;
  }

  let prev;
  if (prevInput.value.trim()) {
    try { prev = JSON.parse(prevInput.value); }
    catch { alert('Prev leagues JSON is invalid'); return; }
  } else {
    prev = DEFAULT_PREV_LEAGUES;
  }

  currentLeagues = buildLeaguesFromQF({ qf, prevLeagues: prev, allTeams: BASE_RATINGS });
  renderLeagues(currentLeagues);
  resultsDiv.innerHTML = '';
  runBtn.disabled = false;
  rerollBtn.disabled = true;
});

runBtn.addEventListener('click', () => {
  if (!currentLeagues) return;
  lastSeed = Date.now();
  runSim(lastSeed);
  rerollBtn.disabled = false;
});
rerollBtn.addEventListener('click', () => {
  if (!currentLeagues) return;
  lastSeed += 1;
  runSim(lastSeed);
});
resetBtn.addEventListener('click', () => {
  location.reload();
});

function renderLeagues(L) {
  leaguesView.innerHTML = '';
  for (const key of ["L1","L2","L3","L4","L5","L6"]) {
    const box = document.createElement('div');
    box.className = 'card';
    box.innerHTML = `<h3 style="margin:0 0 8px">${key}</h3>` +
      `<ol class="list">${L[key].map(t => `<li>${t}</li>`).join('')}</ol>`;
    leaguesView.appendChild(box);
  }
}

function runSim(seed) {
  const params = {
    homeAdv: Number(homeAdvEl.value || 60),
    drawBias: Number(drawBiasEl.value || 0.26),
    rndSeed: seed
  };
  const sim = simulateAll(currentLeagues, BASE_RATINGS, params);
  const finals = playFinals(sim, params.drawBias, seed+123);
  const slots = euroSlots({
    L1: sim.L1.map(r => r.name),
    L2: sim.L2.map(r => r.name),
    L3: sim.L3.map(r => r.name),
    L4: sim.L4.map(r => r.name),
    L5: sim.L5.map(r => r.name),
    L6: sim.L6.map(r => r.name),
  });

  resultsDiv.innerHTML = `
    <div class="grid">
      ${renderTableCard('League 1', sim.L1)}
      ${renderTableCard('League 2', sim.L2)}
      ${renderTableCard('League 3', sim.L3)}
      ${renderTableCard('League 4', sim.L4)}
      ${renderTableCard('League 5', sim.L5)}
      ${renderTableCard('League 6', sim.L6)}
    </div>
    <hr/>
    <h3>Finals (November)</h3>
    <p>Semis: <strong>${finals.semiA[0]}</strong> vs <strong>${finals.semiA[1]}</strong> → <em>${finals.semiA[2]}</em><br/>
       &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>${finals.semiB[0]}</strong> vs <strong>${finals.semiB[1]}</strong> → <em>${finals.semiB[2]}</em><br/>
       Final winner: <strong>${finals.champion}</strong></p>
    <h3>Euro Slots (example mapping)</h3>
    <p><strong>Direct (12):</strong> ${slots.direct.join(', ')}</p>
    <p><strong>Playoffs (12):</strong> ${slots.playoffs.join(', ')}</p>
    <p><strong>Eliminated:</strong> ${slots.eliminated.join(', ')}</p>
  `;
}

function renderTableCard(title, rows) {
  return `
  <div class="card">
    <h3 style="margin:0 0 8px">${title}</h3>
    <table class="table">
      <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr></thead>
      <tbody>
        ${rows.map((r,i) => `<tr>
          <td>${i+1}</td><td>${r.name}</td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td><strong>${r.Pts}</strong></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}
