/* ═══════════════════════════════════════════════════
   BUILD YOUR AI BRAIN  –  Main Application Logic
   ═══════════════════════════════════════════════════ */

'use strict';

const API = window.location.origin;

/* ─── App State ───────────────────────────────────── */
const state = {
  currentLevel:    1,
  totalLevels:     6,
  completedLevels: new Set(),

  /* Level 2 */
  hiddenNeurons: 2,

  /* Level 3 – current customer */
  customer: null,

  /* Level 5 */
  backpropCustomer: null,

  /* Level 6 */
  trainingDone: false,
  score: { correct: 0, wrong: 0, rounds: 0 },

  /* Charts */
  accuracyChart: null,
};

/* ─── Utility helpers ─────────────────────────────── */
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function showToast(msg, duration = 3500) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

async function apiFetch(endpoint, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(`${API}${endpoint}`, opts);
  return res.json();
}

/* ─── Level Navigation ────────────────────────────── */
function goToLevel(n) {
  if (n < 1 || n > state.totalLevels) return;

  /* Hide all cards */
  document.querySelectorAll('.level-card').forEach(c => c.classList.remove('active'));

  /* Show target */
  const card = $(`level-${n}`);
  if (card) {
    card.classList.add('active');
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  state.currentLevel = n;

  /* Update dot UI */
  document.querySelectorAll('.level-dot').forEach((d, i) => {
    const lvl = i + 1;
    d.classList.remove('active', 'completed');
    if (lvl === n)                       d.classList.add('active');
    else if (state.completedLevels.has(lvl)) d.classList.add('completed');
  });

  document.querySelectorAll('.sidebar-connector').forEach((c, i) => {
    c.classList.toggle('filled', state.completedLevels.has(i + 1));
  });

  /* Level-specific init */
  if (n === 1) initLevel1();
  if (n === 2) initLevel2();
  if (n === 3) initLevel3();
  if (n === 4) initLevel4();
  if (n === 5) initLevel5();
  if (n === 6) initLevel6();
}

function completeLevel(n) {
  state.completedLevels.add(n);
  showToast(`🎉 Level ${n} Complete! Moving to next level…`);
  setTimeout(() => goToLevel(n + 1), 900);
}

/* ══════════════════════════════════════════════════
   LEVEL 1 – Meet the AI Brain
══════════════════════════════════════════════════ */
function initLevel1() {
  const canvas = $('network-canvas');
  if (!canvas) return;
  /* Defer one frame so the card has finished layout */
  requestAnimationFrame(() => drawNetwork(canvas, [], false));
}

/* ──────────────────────────────────────────────────
   Neural Network Canvas Drawing
────────────────────────────────────────────────── */
function drawNetwork(canvas, activations = [], animate = false) {
  const ctx = canvas.getContext('2d');

  /* Measure real width via bounding rect — works even right after display:block */
  const rect = canvas.getBoundingClientRect();
  const W = canvas.width  = rect.width  || canvas.parentElement?.offsetWidth || 700;
  const H = canvas.height = rect.height || 280;

  /* White background */
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#fafbff';
  ctx.fillRect(0, 0, W, H);

  if (W < 10) return;   /* nothing to draw yet */

  const layers = [
    { name: 'Input',  count: 3,                    color: '#2563eb', x: W * 0.18 },
    { name: 'Hidden', count: state.hiddenNeurons,   color: '#7c3aed', x: W * 0.5  },
    { name: 'Output', count: 1,                     color: '#0891b2', x: W * 0.82 },
  ];

  const radius = 24;
  const nodePositions = [];

  layers.forEach((layer, li) => {
    const positions = [];
    const totalH = (layer.count - 1) * 68;
    const startY = H / 2 - totalH / 2;
    for (let i = 0; i < layer.count; i++) {
      positions.push({ x: layer.x, y: startY + i * 68 });
    }
    nodePositions.push(positions);
  });

  /* Connections */
  for (let li = 0; li < nodePositions.length - 1; li++) {
    nodePositions[li].forEach(src => {
      nodePositions[li + 1].forEach(dst => {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(dst.x, dst.y);
        ctx.strokeStyle = 'rgba(100,116,139,0.18)';
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      });
    });
  }

  /* Nodes */
  layers.forEach((layer, li) => {
    nodePositions[li].forEach((pos, ni) => {
      const act = activations[li] ? (activations[li][ni] || 0) : 0;

      if (animate && act > 0.3) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 12, 0, Math.PI * 2);
        ctx.fillStyle = hexAlpha(layer.color, act * 0.12);
        ctx.fill();
      }

      /* Fill */
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = hexAlpha(layer.color, animate && act > 0.2 ? 0.15 + act * 0.25 : 0.1);
      ctx.fill();

      /* Border */
      ctx.strokeStyle = layer.color;
      ctx.lineWidth   = animate && act > 0.4 ? 3 : 2;
      ctx.stroke();

      /* Label */
      ctx.fillStyle    = animate && act > 0.3 ? layer.color : '#334155';
      ctx.font         = 'bold 10px Inter';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      const labels = [['Age', 'Income', 'Visits'], null, ['Buy?']];
      const lbl    = labels[li] ? labels[li][ni] : (animate ? Math.round(act * 100) + '%' : '');
      ctx.fillText(lbl || '', pos.x, pos.y);
    });
  });

  canvas.dataset.positions = JSON.stringify(nodePositions);
}

function hexAlpha(hex, a) {
  /* Convert #rrggbb + alpha → rgba */
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* Animate signal flowing left→right */
async function animateSignal(canvas, activations) {
  const layers = [
    { color: '#00e5ff' },
    { color: '#a855f7' },
    { color: '#22d3ee' },
  ];

  /* Flash each layer */
  for (let li = 0; li < layers.length; li++) {
    const acts = activations.map((_, i) => (i === li ? _.map(() => 1) : _.map(() => 0)));
    drawNetwork(canvas, activations.map((a, i) => i <= li ? a : a.map(() => 0)), true);
    await sleep(520);
  }
  drawNetwork(canvas, activations, true);
}

/* ══════════════════════════════════════════════════
   LEVEL 2 – Build the Neural Network
══════════════════════════════════════════════════ */
function initLevel2() {
  renderBuilderNeurons();
  requestAnimationFrame(renderBuilderCanvas);
}

function addHiddenNeuron() {
  if (state.hiddenNeurons >= 6) {
    showToast('⚠️ Max 6 hidden neurons reached');
    return;
  }
  state.hiddenNeurons++;
  renderBuilderNeurons();
  renderBuilderCanvas();
  showToast(`✨ Hidden neuron #${state.hiddenNeurons} added!`);
}

function removeHiddenNeuron() {
  if (state.hiddenNeurons <= 1) {
    showToast('⚠️ Minimum 1 hidden neuron required');
    return;
  }
  state.hiddenNeurons--;
  renderBuilderNeurons();
  renderBuilderCanvas();
}

function renderBuilderNeurons() {
  const list = $('hidden-neuron-list');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 1; i <= state.hiddenNeurons; i++) {
    const chip = document.createElement('div');
    chip.className = 'neuron-chip hidden';
    chip.textContent = `H${i}`;
    chip.id = `hidden-neuron-${i}`;
    list.appendChild(chip);
  }
  $('hidden-count').textContent = state.hiddenNeurons;
}

function renderBuilderCanvas() {
  const canvas = $('builder-canvas');
  if (!canvas) return;
  requestAnimationFrame(() => drawNetwork(canvas, [], false));
}

/* ══════════════════════════════════════════════════
   LEVEL 3 – Forward Propagation
══════════════════════════════════════════════════ */
async function initLevel3() {
  /* Draw empty network skeleton immediately */
  const canvas = $('forward-canvas');
  if (canvas) requestAnimationFrame(() => drawNetwork(canvas, [], false));

  try {
    const data = await apiFetch('/dataset');
    state.customer = data;
    renderCustomerCard('customer-card-3', data);
    $('forward-result').classList.remove('show');
    $('prob-display').style.display = 'none';
  } catch {
    showToast('⚠️ Backend not running – start app.py first');
  }
}

async function runForwardProp() {
  if (!state.customer) return;
  const btn = $('btn-forward');
  btn.classList.add('loading');

  try {
    const result = await apiFetch('/forward', 'POST', {
      age:             state.customer.age,
      income:          state.customer.income,
      website_visits:  state.customer.website_visits,
    });

    /* Animate network */
    const canvas = $('forward-canvas');
    const acts = [
      result.input_normalized,
      result.hidden_layer_outputs,
      [result.output_probability / 100],
    ];
    await animateSignal(canvas, acts);

    /* Show probability */
    const pd = $('prob-display');
    pd.style.display = 'block';
    animateProbability(result.output_probability);

    const verdict = $('prob-verdict');
    if (result.prediction === 'purchase') {
      verdict.textContent = '✅ Prediction: PURCHASE';
      verdict.className   = 'prob-verdict buy';
    } else {
      verdict.textContent = '❌ Prediction: NOT PURCHASE';
      verdict.className   = 'prob-verdict no-buy';
    }

    /* What happened explanation */
    const ex = $('forward-result');
    const hiddenAvg = (result.hidden_layer_outputs.reduce((a,b) => a+b, 0) / result.hidden_layer_outputs.length * 100).toFixed(0);
    const buyText   = result.prediction === 'purchase'
      ? `The AI is <strong>${result.output_probability}% confident</strong> this customer will buy. It flagged them as a likely buyer.`
      : `The AI is only <strong>${result.output_probability}% confident</strong> of a purchase. Below 50% = predicted <em>not</em> a buyer.`;
    ex.innerHTML = `
      <div class="wh-title">🧠 What just happened? (Plain English)</div>
      <p>📥 <strong>Step 1 — Data entered:</strong> The customer’s age, income &amp; web visits were scaled to numbers between 0 and 1 so the AI treats them fairly.</p>
      <p>🔮 <strong>Step 2 — Hidden layer processed:</strong> Your ${state.hiddenNeurons} hidden neurons each multiplied the inputs by their weights and averaged out at about <strong>${hiddenAvg}% activation</strong>. Each neuron decided how strongly it should respond.</p>
      <p>📤 <strong>Step 3 — Output produced:</strong> ${buyText}</p>
      <p style="margin-top:10px;padding-top:10px;border-top:1px solid #ddd6fe;font-style:italic;color:#6d28d9">⚠️ Remember: This AI’s weights are still mostly random — it hasn’t been trained yet. Train it in Level 6 and predictions will become much more accurate!</p>
    `;
    ex.classList.add('show');

    /* Hidden layer breakdown */
    renderHiddenOutputs(result.hidden_layer_outputs);

    state.score.rounds++;
    updateScoreDisplay();

  } catch (err) {
    showToast('❌ Backend error – is app.py running?');
  } finally {
    btn.classList.remove('loading');
  }
}

function animateProbability(pct) {
  const pv = $('prob-value');
  const circle = $('prob-circle');
  let current = 0;
  const target = pct;
  const step = () => {
    current = Math.min(current + 2.5, target);
    pv.textContent = Math.round(current) + '%';
    circle.style.setProperty('--pct', current + '%');
    if (current < target) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);

  /* Color by threshold */
  const color = pct >= 50 ? '#10b981' : '#ef4444';
  circle.style.borderColor = color;
  circle.style.boxShadow   = `0 0 18px ${color}88, inset 0 0 30px ${color}22`;
}

function renderHiddenOutputs(outputs) {
  const container = $('hidden-outputs');
  if (!container) return;
  container.innerHTML = outputs.map((v, i) => `
    <div class="info-card">
      <div class="info-card-icon">🔮</div>
      <div class="info-card-title">Hidden ${i + 1}</div>
      <div class="info-card-value purple">${(v * 100).toFixed(1)}%</div>
    </div>
  `).join('');
}

function renderCustomerCard(cardId, data) {
  const card = $(cardId);
  if (!card) return;
  card.innerHTML = `
    <div class="customer-avatar">👤</div>
    <div class="customer-info">
      <h3>${data.persona}</h3>
      <p>Customer Profile · Retail Scenario</p>
    </div>
    <div class="customer-stats">
      <div class="cstat">
        <div class="cstat-val">${data.age}</div>
        <div class="cstat-lbl">Age</div>
      </div>
      <div class="cstat">
        <div class="cstat-val">$${data.income}k</div>
        <div class="cstat-lbl">Income</div>
      </div>
      <div class="cstat">
        <div class="cstat-val">${data.website_visits}</div>
        <div class="cstat-lbl">Web Visits</div>
      </div>
      <div class="cstat">
        <div class="cstat-val">
          <span class="tag ${data.label === 'purchase' ? 'tag-purchase' : 'tag-no-purchase'}">
            ${data.label === 'purchase' ? '✅ Buy' : '❌ No Buy'}
          </span>
        </div>
        <div class="cstat-lbl">Actual</div>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════════
   LEVEL 4 – Activation Function Slider
══════════════════════════════════════════════════ */
async function initLevel4() {
  try {
    const data = await apiFetch('/sigmoid', 'POST', { start: -6, end: 6, steps: 80 });
    renderSigmoidCanvas(data.x, data.y);
  } catch {
    /* Fallback: compute locally */
    const xs = Array.from({ length: 80 }, (_, i) => -6 + i * 0.15);
    const ys = xs.map(x => 1 / (1 + Math.exp(-x)));
    renderSigmoidCanvas(xs, ys);
  }

  /* Hook up slider once — guard against re-attaching on revisit */
  const slider = $('activation-slider');
  if (slider && !slider._listenerAttached) {
    slider._listenerAttached = true;
    updateActivationDisplay(parseFloat(slider.value));
    slider.addEventListener('input', () => updateActivationDisplay(parseFloat(slider.value)));
  } else if (slider) {
    updateActivationDisplay(parseFloat(slider.value));
  }
}

function renderSigmoidCanvas(xs, ys) {
  const canvas = $('sigmoid-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const W   = canvas.width  = rect.width  || canvas.parentElement?.offsetWidth || 600;
  const H   = canvas.height = rect.height || canvas.offsetHeight || 220;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#fafbff';
  ctx.fillRect(0, 0, W, H);

  if (W < 10) return;

  /* Grid */
  ctx.strokeStyle = 'rgba(100,116,139,0.12)';
  ctx.lineWidth   = 1;
  for (let i = 0; i <= 4; i++) {
    const y = (i / 4) * H;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for (let i = 0; i <= 6; i++) {
    const x = (i / 6) * W;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }

  /* Axes labels */
  ctx.fillStyle   = '#94a3b8';
  ctx.font        = '11px Inter';
  ctx.textAlign   = 'center';
  ctx.fillText('0',   W / 2, H - 6);
  ctx.textAlign   = 'right';
  ctx.fillText('0.5', W - 8, H / 2 + 4);
  ctx.fillText('1.0', W - 8, 14);

  /* Sigmoid curve */
  const minX = xs[0], maxX = xs[xs.length - 1];
  const toCanvasX = v => ((v - minX) / (maxX - minX)) * W;
  const toCanvasY = v => H - v * H;

  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0,   '#2563eb');
  grad.addColorStop(0.5, '#7c3aed');
  grad.addColorStop(1,   '#0891b2');

  ctx.beginPath();
  xs.forEach((x, i) => {
    const cx = toCanvasX(x);
    const cy = toCanvasY(ys[i]);
    i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
  });
  ctx.strokeStyle = grad;
  ctx.lineWidth   = 3;
  ctx.shadowColor = '#7c3aed';
  ctx.shadowBlur  = 10;
  ctx.stroke();
  ctx.shadowBlur  = 0;

  canvas._xs  = xs;  canvas._ys  = ys;
  canvas._toX = toCanvasX; canvas._toY = toCanvasY;
  canvas._W   = W;   canvas._H   = H;
}

function updateActivationDisplay(val) {
  const sig = 1 / (1 + Math.exp(-val));
  $('act-input-val').textContent  = val.toFixed(1);
  $('act-output-val').textContent = (sig * 100).toFixed(1) + '%';
  $('slider-val-display').textContent = val.toFixed(1);

  /* State text */
  const stateEl = $('neuron-state-text');
  if (sig < 0.3) {
    stateEl.textContent = '😴 Neuron is INACTIVE – signal too weak';
    stateEl.style.color = '#ef4444';
  } else if (sig < 0.6) {
    stateEl.textContent = '⚡ Neuron is PARTIALLY active';
    stateEl.style.color = '#f59e0b';
  } else {
    stateEl.textContent = '🔥 Neuron is FULLY ACTIVE – passing signal!';
    stateEl.style.color = '#10b981';
  }

  /* Draw point on sigmoid canvas */
  const canvas = $('sigmoid-canvas');
  if (!canvas || !canvas._xs) return;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderSigmoidCanvas(canvas._xs, canvas._ys);

  /* Red dot */
  const cx = canvas._toX(val);
  const cy = canvas._toY(sig);
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fillStyle   = '#f59e0b';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur  = 16;
  ctx.fill();
  ctx.shadowBlur = 0;

  /* Dashed lines */
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(245,158,11,0.4)';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, canvas.height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(canvas.width, cy);  ctx.stroke();
  ctx.setLineDash([]);
}

/* ══════════════════════════════════════════════════
   LEVEL 5 – Backpropagation
══════════════════════════════════════════════════ */
async function initLevel5() {
  /* Draw empty network skeleton immediately */
  const canvas = $('backprop-canvas');
  if (canvas) requestAnimationFrame(() => drawNetwork(canvas, [], false));

  try {
    const data = await apiFetch('/dataset');
    state.backpropCustomer = data;
    renderCustomerCard('customer-card-5', data);
    $('backprop-result').classList.remove('show');
    $('backprop-anim-box').style.display = 'none';
  } catch {
    showToast('⚠️ Backend not running');
  }
}

async function runBackprop() {
  if (!state.backpropCustomer) return;
  const btn = $('btn-backprop');
  btn.classList.add('loading');

  try {
    /* First run forward prop to get prediction */
    const fwd = await apiFetch('/forward', 'POST', {
      age:             state.backpropCustomer.age,
      income:          state.backpropCustomer.income,
      website_visits:  state.backpropCustomer.website_visits,
    });

    /* Now backprop */
    const result = await apiFetch('/backprop', 'POST', {
      age:             state.backpropCustomer.age,
      income:          state.backpropCustomer.income,
      website_visits:  state.backpropCustomer.website_visits,
      actual_label:    state.backpropCustomer.label,
    });

    const animBox = $('backprop-anim-box');
    animBox.style.display = 'block';

    /* Show error comparison */
    const pred   = result.prediction_before >= 50 ? 'purchase' : 'not_purchase';
    const actual = state.backpropCustomer.label;
    const correct = pred === actual;

    $('backprop-pred-val').textContent   = result.prediction_before.toFixed(1) + '%';
    $('backprop-actual-val').textContent = actual === 'purchase' ? '✅ Purchase' : '❌ Not Purchase';

    const errorBox = $('error-signal-box');
    if (!correct) {
      errorBox.style.background = 'rgba(239,68,68,0.08)';
      errorBox.style.borderColor = 'rgba(239,68,68,0.25)';
      $('backprop-error-icon').textContent = '⚠️';
      $('backprop-error-title').textContent = 'Prediction was WRONG!';
      $('backprop-error-desc').textContent  = `AI predicted "${pred}" but actual is "${actual}". Time to learn!`;
    } else {
      errorBox.style.background = 'rgba(16,185,129,0.08)';
      errorBox.style.borderColor = 'rgba(16,185,129,0.25)';
      $('backprop-error-icon').textContent = '✅';
      $('backprop-error-title').textContent = 'Correct Prediction – still adjusting!';
      $('backprop-error-desc').textContent  = 'Even when correct, AI slightly adjusts weights to become more confident.';
    }

    /* Animate backward signal */
    await animateBackwardSignal();

    /* Update weights display */
    $('weight-change-box').innerHTML = `
      <div class="weight-change">
        <strong>📉 Loss Before:</strong> ${result.loss_before}<br>
        <strong>📈 Loss After:</strong>  ${result.loss_after}<br>
        <strong>📊 Prediction Before:</strong> ${result.prediction_before}% → <strong>After:</strong> ${result.prediction_after}%<br>
        <br>
        <strong>🔧 What changed?</strong><br>
        All 16 connection weights were nudged slightly in the direction that reduces error.<br>
        This is called <strong>Gradient Descent</strong>.
      </div>
    `;

    const ex = $('backprop-result');
    ex.innerHTML = `<strong>🔄 Backpropagation Complete!</strong><br>${result.explanation}`;
    ex.classList.add('show');

    state.score.rounds++;
    if (correct) state.score.correct++; else state.score.wrong++;
    updateScoreDisplay();

  } catch {
    showToast('❌ Backend error');
  } finally {
    btn.classList.remove('loading');
  }
}

async function animateBackwardSignal() {
  const canvas = $('backprop-canvas');
  if (!canvas) return;

  const layers = [
    [1, 1, 1],        // input
    [1, 1, 1, 1],     // hidden
    [1],              // output
  ];

  /* Right to left glow */
  for (let li = layers.length - 1; li >= 0; li--) {
    const acts = layers.map((a, i) => {
      if (i > li) return a.map(() => 0.2);
      if (i === li) return a.map(() => 1);
      return a.map(() => 0.15);
    });
    drawNetwork(canvas, acts, true);
    await sleep(500);
  }
}

/* ══════════════════════════════════════════════════
   LEVEL 6 – Train Your AI
══════════════════════════════════════════════════ */
function initLevel6() {
  const canvas = $('training-canvas');
  if (!canvas) return;
  requestAnimationFrame(() => drawNetwork(canvas, [], false));
}

async function runTraining() {
  const btn = $('btn-train');
  btn.classList.add('loading');

  const epochInput = $('epoch-count');
  const epochs = parseInt(epochInput ? epochInput.value : 50);

  try {
    const result = await apiFetch('/accuracy', 'POST', { epochs });

    /* Animate progress bar */
    const history = result.accuracy_history;
    await animateTraining(history);

    /* Chart */
    renderAccuracyChart(history);

    /* Final display */
    /* Training result explanation */
    const startAcc = history[0];
    const midAcc   = history[Math.floor(history.length / 2)];
    const endAcc   = history[history.length - 1];
    const improved  = endAcc > startAcc;
    const exTr = $('training-explainer');
    exTr.innerHTML = `
      <div class="wh-title">🎓 Training Complete! Here’s what happened:</div>
      <p>📊 <strong>Accuracy journey:</strong> Started at <strong>${startAcc}%</strong> → halfway through: <strong>${midAcc}%</strong> → final: <strong style="color:#059669">${endAcc}%</strong>.</p>
      <p>🔄 <strong>How it learned:</strong> The AI ran ${history.length} complete passes (epochs) through all 10 customer examples. In every pass, it made predictions and corrected its weights using backpropagation.</p>
      <p>${improved
        ? `✅ <strong>Great result!</strong> Accuracy improved by <strong>${(endAcc - startAcc).toFixed(1)} percentage points</strong>. The AI learned meaningful patterns from the data.`
        : `⚠️ Accuracy stayed similar. This can happen with a small dataset (only 10 customers). Try adding more epochs or adjusting the hidden neuron count in Level 2.`
      }</p>
      <p style="margin-top:10px;padding-top:10px;border-top:1px solid #ddd6fe;font-style:italic;color:#6d28d9">💼 <strong>MBA Insight:</strong> In real business AI, you’d train on thousands of customer records over many epochs. With more data, the AI would become even more accurate and reliable.</p>
    `;
    exTr.classList.add('show');

    state.trainingDone = true;
    state.score.correct = Math.round(result.final_accuracy / 10);
    updateScoreDisplay();

    showToast(`🏆 Training complete! Final accuracy: ${result.final_accuracy}%`);

    /* Show completion banner */
    const banner = $('completion-banner');
    if (banner) {
      setTimeout(() => { banner.style.display = 'block'; }, 600);
    }

  } catch {
    showToast('❌ Backend error – is app.py running?');
  } finally {
    btn.classList.remove('loading');
  }
}

async function animateTraining(history) {
  const bar  = $('training-bar');
  const pval = $('training-pct');
  const fval = $('final-accuracy');

  for (let i = 0; i < history.length; i++) {
    const pct = history[i];
    if (bar) { bar.style.width = pct + '%'; }
    if (pval) pval.textContent = pct.toFixed(1) + '%';
    if (fval) fval.textContent = pct.toFixed(1) + '%';
    await sleep(40);
  }
}

function renderAccuracyChart(history) {
  const ctx = $('accuracy-chart');
  if (!ctx) return;

  if (state.accuracyChart) {
    state.accuracyChart.destroy();
  }

  const labels = history.map((_, i) => `Epoch ${i + 1}`);

  state.accuracyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label:           'Training Accuracy (%)',
        data:            history,
        borderColor:     '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.07)',
        borderWidth:     2.5,
        pointRadius:     0,
        pointHoverRadius: 5,
        tension:         0.4,
        fill:            true,
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#475569', font: { family: 'Inter', size: 12 } } }
      },
      scales: {
        x: {
          ticks:  { color: '#64748b', maxTicksLimit: 8 },
          grid:   { color: 'rgba(0,0,0,0.05)' },
        },
        y: {
          min:   0,
          max:   100,
          ticks: { color: '#64748b', callback: v => v + '%' },
          grid:  { color: 'rgba(0,0,0,0.06)' },
        },
      },
    }
  });
}

/* ─── Score Display ───────────────────────────────── */
function updateScoreDisplay() {
  const el = $('score-rounds');
  if (el) el.textContent = state.score.rounds;
  const ec = $('score-correct');
  if (ec) ec.textContent = state.score.correct;
}

/* ══════════════════════════════════════════════════
   DOM Ready – Bootstrap
══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* Level navigation dots (sidebar items) */
  document.querySelectorAll('.level-dot').forEach((dot, i) => {
    dot.addEventListener('click', () => goToLevel(i + 1));
  });

  /* Start at Level 1 – double-rAF ensures the browser has painted before we draw */
  goToLevel(1);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const c1 = $('network-canvas');
    if (c1) drawNetwork(c1, [], false);
  }));

  /* Level 1 next button */
  const l1next = $('btn-l1-next');
  if (l1next) l1next.addEventListener('click', () => completeLevel(1));

  /* Level 2 */
  const l2addBtn = $('btn-add-neuron');
  if (l2addBtn) l2addBtn.addEventListener('click', addHiddenNeuron);

  const l2rmBtn = $('btn-remove-neuron');
  if (l2rmBtn) l2rmBtn.addEventListener('click', removeHiddenNeuron);

  const l2next = $('btn-l2-next');
  if (l2next) l2next.addEventListener('click', () => completeLevel(2));

  /* Level 3 */
  const l3btn = $('btn-forward');
  if (l3btn) l3btn.addEventListener('click', runForwardProp);

  const l3new = $('btn-new-customer');
  if (l3new) l3new.addEventListener('click', initLevel3);

  const l3next = $('btn-l3-next');
  if (l3next) l3next.addEventListener('click', () => completeLevel(3));

  /* Level 4 */
  const l4next = $('btn-l4-next');
  if (l4next) l4next.addEventListener('click', () => completeLevel(4));

  /* Level 5 */
  const l5btn = $('btn-backprop');
  if (l5btn) l5btn.addEventListener('click', runBackprop);

  const l5new = $('btn-new-customer-5');
  if (l5new) l5new.addEventListener('click', initLevel5);

  const l5next = $('btn-l5-next');
  if (l5next) l5next.addEventListener('click', () => completeLevel(5));

  /* Level 6 */
  const l6btn = $('btn-train');
  if (l6btn) l6btn.addEventListener('click', runTraining);

  /* Level 2 builder init */
  initLevel2();

  /* Resize: redraw all visible canvases */
  window.addEventListener('resize', () => {
    ['network-canvas', 'builder-canvas', 'forward-canvas',
     'backprop-canvas', 'training-canvas'].forEach(id => {
      const c = $(id);
      if (c && c.offsetParent !== null) drawNetwork(c, [], false);
    });
  });
});
