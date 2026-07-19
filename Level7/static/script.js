const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const charts = { pop: null, grass: null };
let lastState = null;
let currentSpeed = 1;

const DEER_COLOR = '#3b82f6';
const LION_COLOR = '#f59e0b';
const GRASS_COLOR = '#10b981';

// Fetch state loop
async function fetchState() {
    try {
        const res = await fetch('/state');
        const state = await res.json();
        lastState = state;
        updateUI(state);
        draw(state);
        
        // Setup config form once if empty
        const deerContainer = document.getElementById('params-deer');
        if (deerContainer && deerContainer.children.length === 0) {
            buildConfigForm(state.config);
        }
    } catch (e) {
        console.error("Error fetching state:", e);
    }
    
    // Schedule the next poll only AFTER the current fetch is complete
    setTimeout(fetchState, 15);
}

function buildConfigForm(config) {
    const deerContainer = document.getElementById('params-deer');
    const lionContainer = document.getElementById('params-lion');
    const envContainer = document.getElementById('params-environment');
    
    deerContainer.innerHTML = '';
    lionContainer.innerHTML = '';
    envContainer.innerHTML = '';
    
    for (const [key, value] of Object.entries(config)) {
        if (typeof value === 'object') continue; // Skip complex objects like hiding spots
        
        const wrapper = document.createElement('div');
        wrapper.className = 'flex flex-col gap-1';
        
        const label = document.createElement('label');
        label.className = 'text-xs font-semibold text-slate-400 capitalize';
        label.innerText = key.replace(/_/g, ' ');
        
        const input = document.createElement('input');
        input.type = 'number';
        if (!Number.isInteger(value)) input.step = '0.1';
        input.className = 'bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500';
        input.value = value;
        input.name = key;
        
        wrapper.appendChild(label);
        wrapper.appendChild(input);
        
        // Group by category
        if (key.includes('deer')) {
            deerContainer.appendChild(wrapper);
        } else if (key.includes('lion')) {
            lionContainer.appendChild(wrapper);
        } else {
            envContainer.appendChild(wrapper);
        }
    }
}

// Function to collect parameters and send them to /config
async function submitConfig() {
    const form = document.getElementById('config-form');
    const formData = new FormData(form);
    const data = {};
    for (const [key, value] of formData.entries()) {
        data[key] = Number(value);
    }
    // Keep speed_mult updated in sync with current speed selection
    data['speed_mult'] = currentSpeed;
    
    await fetch('/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}

// Buttons behavior implementation: Start, Pause, Stop
document.getElementById('btn-start').addEventListener('click', async () => {
    // 1. Submit the new parameters first
    await submitConfig();
    // 2. Play/resume the simulation
    await fetch('/play', { method: 'POST' });
});

document.getElementById('btn-pause').addEventListener('click', async () => {
    // Pause the simulation
    await fetch('/pause', { method: 'POST' });
});

document.getElementById('btn-stop').addEventListener('click', async () => {
    // Stop: pause first, then reset simulation state
    await fetch('/pause', { method: 'POST' });
    await fetch('/reset', { method: 'POST' });
});

// Speed selection handlers
document.querySelectorAll('.btn-speed').forEach(button => {
    button.addEventListener('click', async (e) => {
        // Update active class styles
        document.querySelectorAll('.btn-speed').forEach(btn => {
            btn.className = 'btn-speed text-xs px-2.5 py-1 rounded font-semibold text-slate-400 hover:text-white transition-colors';
        });
        e.target.className = 'btn-speed text-xs px-2.5 py-1 rounded font-semibold text-white bg-slate-700 transition-colors';
        
        currentSpeed = parseFloat(e.target.dataset.speed);
        
        // Update python config via POST
        await fetch('/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ speed_mult: currentSpeed })
        });
    });
});

function initCharts() {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        elements: { point: { radius: 0 }, line: { borderWidth: 1.5 } },
        scales: { x: { display: false } },
        plugins: { legend: { labels: { color: '#94a3b8' } } }
    };

    charts.pop = new Chart(document.getElementById('chartPopulation'), {
        type: 'line',
        data: { labels: [], datasets: [
            { label: 'Deer', data: [], borderColor: DEER_COLOR },
            { label: 'Lions', data: [], borderColor: LION_COLOR }
        ]},
        options: commonOptions
    });

    charts.grass = new Chart(document.getElementById('chartGrass'), {
        type: 'line',
        data: { labels: [], datasets: [
            { label: 'Grass', data: [], borderColor: GRASS_COLOR }
        ]},
        options: commonOptions
    });
}

function updateUI(state) {
    document.getElementById('ui-grassCount').innerText = state.grass.length;
    document.getElementById('ui-deerCount').innerText = state.deer.length;
    document.getElementById('ui-lionCount').innerText = state.lions.length;
    document.getElementById('ui-day').innerText = state.day;
    
    // Status text and button highlights update
    const statusEl = document.getElementById('ui-status');
    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnStop = document.getElementById('btn-stop');

    if (state.running) {
        statusEl.innerText = 'Running';
        statusEl.className = 'text-emerald-400';
        
        btnStart.className = 'flex-1 sm:flex-none px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-800 shadow-[0_0_10px_rgba(16,185,129,0.3)]';
        btnPause.className = 'flex-1 sm:flex-none px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg transition-colors';
        btnStop.className = 'flex-1 sm:flex-none px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg transition-colors';
    } else {
        if (state.day > 0) {
            statusEl.innerText = 'Paused';
            statusEl.className = 'text-amber-500';
            
            btnStart.className = 'flex-1 sm:flex-none px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg transition-colors';
            btnPause.className = 'flex-1 sm:flex-none px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-800 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
            btnStop.className = 'flex-1 sm:flex-none px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg transition-colors';
        } else {
            statusEl.innerText = 'Stopped';
            statusEl.className = 'text-rose-400';
            
            btnStart.className = 'flex-1 sm:flex-none px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg transition-colors';
            btnPause.className = 'flex-1 sm:flex-none px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg transition-colors';
            btnStop.className = 'flex-1 sm:flex-none px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors ring-2 ring-rose-400 ring-offset-2 ring-offset-slate-800 shadow-[0_0_10px_rgba(239,68,68,0.3)]';
        }
    }
    
    if (state.history.labels.length > 0) {
        charts.pop.data.labels = state.history.labels;
        charts.pop.data.datasets[0].data = state.history.deer;
        charts.pop.data.datasets[1].data = state.history.lions;
        charts.pop.update();
        
        charts.grass.data.labels = state.history.labels;
        charts.grass.data.datasets[0].data = state.history.grass;
        charts.grass.update();
    }
}

let activeDeathEffects = [];

function draw(state) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw hiding spots
    if (state.hiding_spots) {
        for (const s of state.hiding_spots) {
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.scale(s.rx, s.ry);
            ctx.beginPath();
            ctx.arc(0, 0, 1, 0, Math.PI * 2);
            ctx.restore();
            ctx.fillStyle = 'rgba(120, 113, 108, 0.35)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(168, 162, 158, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = 'rgba(200,200,200,0.5)';
            ctx.font = '10px Plus Jakarta Sans';
            ctx.textAlign = 'center';
            ctx.fillText('⛰ Shelter', s.x, s.y + s.ry + 14);
        }
    }
    
    // Draw Grass (constant color now since no seasons)
    for (const g of state.grass) {
        ctx.beginPath();
        ctx.arc(g.x, g.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = GRASS_COLOR;
        ctx.fill();
    }
    
    // Draw Deer
    for (const d of state.deer) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = DEER_COLOR;
        ctx.fill();
    }
    
    // Draw Lions
    for (const l of state.lions) {
        ctx.beginPath();
        ctx.arc(l.x, l.y, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = LION_COLOR;
        ctx.fill();
        
        if (l.state === 'pounce') {
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(l.x, l.y, 8, 0, Math.PI*2);
            ctx.stroke();
        }
    }
    
    // New death effects from state
    if (state.death_effects) {
        for (const effect of state.death_effects) {
            activeDeathEffects.push({x: effect.x, y: effect.y, r: 5, alpha: 1});
        }
    }
    
    // Draw and update active death effects
    for (let i = activeDeathEffects.length - 1; i >= 0; i--) {
        const e = activeDeathEffects[i];
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(239, 68, 68, ${e.alpha})`; // red-500
        ctx.lineWidth = 2;
        ctx.stroke();
        e.r += 0.5;
        e.alpha -= 0.05;
        if (e.alpha <= 0) activeDeathEffects.splice(i, 1);
    }
}

initCharts();
fetchState();
