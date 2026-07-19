// Global State
let canvas, ctx;
let organisms = {
    deer: [],
    lions: [],
    grass: [],
    deathEffects: []
};
let isRunning = false;
let simulationTimeout;
let animationFrame;
let currentDay = 0;
let season = 'Wet'; // 'Wet' or 'Dry'
let params = {};
let historyData = {
    labels: [],
    deer: [],
    lions: [],
    grass: [],
    seasonIndex: [],
    netDeer: [],
    netLion: []
};
let charts = {};

let lastDeerCount = 0;
let lastLionCount = 0;

// Constants
const SPEED = 100;
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 440;
const DEER_COLOR = '#3b82f6';
const LION_COLOR = '#f59e0b';
const GRASS_COLOR = '#10b981';

// Hiding spots — rocky outcrops deer can enter but lions cannot
const HIDING_SPOTS = [
    { x: 180, y: 120, rx: 50, ry: 35 },
    { x: 980, y: 320, rx: 50, ry: 35 },
    { x: 600, y: 220, rx: 60, ry: 40 },
    { x: 150, y: 350, rx: 45, ry: 30 },
    { x: 1050, y: 100, rx: 45, ry: 30 }
];
function inHidingSpot(x, y) {
    for (let s of HIDING_SPOTS) {
        let dx = (x - s.x) / s.rx;
        let dy = (y - s.y) / s.ry;
        if (dx*dx + dy*dy < 1) return true;
    }
    return false;
}

// Math utils
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const randomRange = (min, max) => Math.random() * (max - min) + min;

// --- Organism Classes ---

class Entity {
    constructor(x, y) {
        this.x = x !== undefined ? x : randomRange(20, CANVAS_WIDTH - 20);
        this.y = y !== undefined ? y : randomRange(20, CANVAS_HEIGHT - 20);
        this.vx = randomRange(-1, 1);
        this.vy = randomRange(-1, 1);
        this.dead = false;
    }
    // Border repulsion — gives a steering force pushing away from edges
    getBorderRepulsion(margin = 40, strength = 2.0) {
        let fx = 0, fy = 0;
        if (this.x < margin) fx += strength * (1 - this.x / margin);
        if (this.x > CANVAS_WIDTH - margin) fx -= strength * (1 - (CANVAS_WIDTH - this.x) / margin);
        if (this.y < margin) fy += strength * (1 - this.y / margin);
        if (this.y > CANVAS_HEIGHT - margin) fy -= strength * (1 - (CANVAS_HEIGHT - this.y) / margin);
        return { fx, fy };
    }
    move(speedMult = 1) {
        let mag = Math.hypot(this.vx, this.vy) || 1;
        this.x += (this.vx / mag) * speedMult;
        this.y += (this.vy / mag) * speedMult;

        // Hard bounce off walls (safety net)
        if (this.x < 0) { this.x = 2; this.vx = Math.abs(this.vx); }
        if (this.x > CANVAS_WIDTH) { this.x = CANVAS_WIDTH - 2; this.vx = -Math.abs(this.vx); }
        if (this.y < 0) { this.y = 2; this.vy = Math.abs(this.vy); }
        if (this.y > CANVAS_HEIGHT) { this.y = CANVAS_HEIGHT - 2; this.vy = -Math.abs(this.vy); }
    }
}

class Grass extends Entity {
    constructor(x, y) {
        super(x, y);
        this.radius = 2;
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = season === 'Wet' ? GRASS_COLOR : '#a3a3a3'; // Lush vs withered
        ctx.shadowBlur = 4;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}


class Animal extends Entity {
    constructor(x, y) {
        super(x, y);
        this.age = 0;
        this.daysSinceLastReproduction = 0;
        this.daysStarving = 0;
    }
}

class Deer extends Animal {
    constructor(x, y, age = 0) {
        super(x, y);
        this.age = age;
        this.daysSinceLastReproduction = Math.floor(randomRange(0, 200));
        this.radius = 3.5;
        this.foodEaten = 0;
    }
    
    update() {
        let steerX = 0;
        let steerY = 0;
        let speedMult = 1.5;
        
        // Border repulsion — steer away from edges naturally
        let border = this.getBorderRepulsion(50, 3.0);
        steerX += border.fx;
        steerY += border.fy;
        
        // Flee lions — top priority
        let nearestLion = null;
        let minDistL = 130;
        for (let l of organisms.lions) {
            let d = distance(this, l);
            if (d < minDistL) {
                minDistL = d;
                nearestLion = l;
            }
        }
        if (nearestLion) {
            if (inHidingSpot(this.x, this.y)) {
                // Safe inside! Don't run out. Just stay near center.
                speedMult = 0.5; // Move slowly inside
                let nearestSpot = HIDING_SPOTS[0];
                for (let s of HIDING_SPOTS) {
                    if (Math.hypot(this.x - s.x, this.y - s.y) < Math.hypot(this.x - nearestSpot.x, this.y - nearestSpot.y)) {
                        nearestSpot = s;
                    }
                }
                steerX += (nearestSpot.x - this.x) * 0.1;
                steerY += (nearestSpot.y - this.y) * 0.1;
            } else {
                // Stronger flee when lion is closer
                let urgency = 1 - (minDistL / 130);
                steerX += (this.x - nearestLion.x) * (2 + urgency * 3);
                steerY += (this.y - nearestLion.y) * (2 + urgency * 3);
                speedMult = 3.0; // Sprint when fleeing
                
                // Seek nearest hiding spot when lion is dangerously close (< 80px)
                if (minDistL < 80) {
                    let nearestSpot = null;
                    let minSpotDist = Infinity;
                    for (let s of HIDING_SPOTS) {
                        let d = Math.hypot(this.x - s.x, this.y - s.y);
                        if (d < minSpotDist) { minSpotDist = d; nearestSpot = s; }
                    }
                    if (nearestSpot && minSpotDist > 5) {
                        steerX += (nearestSpot.x - this.x) * 3.0;
                        steerY += (nearestSpot.y - this.y) * 3.0;
                    }
                }
            }
        } else {
            // Seek grass — always foraging
            if (organisms.grass.length > 0) {
                let nearestG = null;
                let minDistG = Infinity;
                // Sample up to 60 grass patches to find nearest (performance-friendly)
                let step = Math.max(1, Math.floor(organisms.grass.length / 60));
                for (let i = 0; i < organisms.grass.length; i += step) {
                    let g = organisms.grass[i];
                    let d = distance(this, g);
                    if (d < minDistG) {
                        minDistG = d;
                        nearestG = g;
                    }
                }
                if (nearestG) {
                    let pull = 1.0;
                    steerX += (nearestG.x - this.x) * pull;
                    steerY += (nearestG.y - this.y) * pull;
                    // Slow down when near grass to graze
                    if (minDistG < 15) speedMult = 0.5;
                }
            }

            // Herding (cohesion) — group together when safe and grazing
            let cx = 0, cy = 0, count = 0;
            for (let d of organisms.deer) {
                if (d !== this && distance(this, d) < 60) {
                    cx += d.x; cy += d.y; count++;
                }
            }
            if (count > 0) {
                steerX += (cx/count - this.x) * 0.08;
                steerY += (cy/count - this.y) * 0.08;
            }
        }

        this.vx += steerX * 0.012;
        this.vy += steerY * 0.012;

        // Apply friction/drag
        this.vx *= 0.93;
        this.vy *= 0.93;
        
        // Ensure minimum wandering movement
        if (Math.abs(this.vx) < 0.15) this.vx += randomRange(-0.6, 0.6);
        if (Math.abs(this.vy) < 0.15) this.vy += randomRange(-0.6, 0.6);

        this.move(speedMult);
    }
    
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = DEER_COLOR;
        ctx.fill();
    }
}

class Lion extends Animal {
    constructor(x, y, age = 0) {
        super(x, y);
        this.age = age;
        this.daysSinceLastReproduction = Math.floor(randomRange(0, 200));
        this.radius = 5.5;
        this.state = 'wander'; // wander, stalk, pounce
        this.foodEaten = 0;
        this.daysSinceLastMeal = Math.floor(randomRange(0, 10)); // stagger starvation
    }
    
    update() {
        let steerX = 0;
        let steerY = 0;
        let speedMult = 1.0;
        
        // Border repulsion — steer away from edges naturally
        let border = this.getBorderRepulsion(50, 3.0);
        steerX += border.fx;
        steerY += border.fy;
        
        // HUNTING MODE — find and pursue nearest deer
        let nearestDeer = null;
        let minDist = Infinity;
        for (let d of organisms.deer) {
            let dist = distance(this, d);
            if (dist < minDist) {
                minDist = dist;
                nearestDeer = d;
            }
        }
        
        if (nearestDeer) {
            if (minDist < 40) {
                // Close enough — pounce! Sprint at prey — but can't enter hiding spots
                if (!inHidingSpot(nearestDeer.x, nearestDeer.y)) {
                    this.state = 'pounce';
                    speedMult = 3.2;
                    steerX += (nearestDeer.x - this.x) * 3;
                    steerY += (nearestDeer.y - this.y) * 3;
                } else {
                    // Deer is in hiding spot — give up this target, wander
                    this.state = 'wander';
                    speedMult = 1.0;
                }
            } else if (minDist <= 120) {
                // In range — stalk carefully
                this.state = 'stalk';
                speedMult = 1.5;
                steerX += (nearestDeer.x - this.x) * 1.5;
                steerY += (nearestDeer.y - this.y) * 1.5;
            } else {
                // Deer far away — wander toward them broadly
                this.state = 'wander';
                speedMult = 2.0;
                steerX += (nearestDeer.x - this.x) * 0.3;
                steerY += (nearestDeer.y - this.y) * 0.3;
            }
        } else {
            this.state = 'wander';
            speedMult = 2.0;
        }
        
        // Pride clustering — stick near other lions when wandering
        if (this.state === 'wander') {
             let cx = 0, cy = 0, count = 0;
             for (let l of organisms.lions) {
                 if (l !== this && distance(this, l) < 150) {
                     cx += l.x; cy += l.y; count++;
                 }
             }
             if (count > 0) {
                 steerX += (cx/count - this.x) * 0.04;
                 steerY += (cy/count - this.y) * 0.04;
             }
        }
        
        this.vx += steerX * 0.02;
        this.vy += steerY * 0.02;

        this.vx *= 0.93;
        this.vy *= 0.93;
        
        // Minimum wandering
        if (Math.abs(this.vx) < 0.15) this.vx += randomRange(-0.4, 0.4);
        if (Math.abs(this.vy) < 0.15) this.vy += randomRange(-0.4, 0.4);

        this.move(speedMult * 2.0);
    }
    
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        if (this.state === 'pounce') ctx.fillStyle = '#ef4444';       // Red — attacking
        else if (this.state === 'stalk') ctx.fillStyle = '#fde047';   // Yellow — stalking
        else if (this.state === 'rest') ctx.fillStyle = '#78716c';    // Dim grey — resting/full
        else ctx.fillStyle = LION_COLOR;                              // Orange — wandering
        
        ctx.fill();
    }
}

// --- Setup ---

function getParams() {
    params = {
        initDeer: parseInt(document.getElementById('param-initDeer').value),
        initLions: parseInt(document.getElementById('param-initLions').value),
        grassSpawn: parseInt(document.getElementById('param-grassSpawn').value),
        seasonLength: parseInt(document.getElementById('param-seasonLength').value),
        deerFoodReq: parseInt(document.getElementById('param-deerFoodReq').value) || 5,
        lionFoodReq: parseInt(document.getElementById('param-lionFoodReq').value) || 2,
        deerStarvation: parseInt(document.getElementById('param-deerStarvation').value),
        lionStarvation: parseInt(document.getElementById('param-lionStarvation').value),
        days: parseInt(document.getElementById('param-days').value)
    };
}

function initCharts() {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        elements: { point: { radius: 0 }, line: { borderWidth: 1.5 } },
        scales: {
            x: { display: false }
        },
        plugins: { legend: { labels: { color: '#94a3b8' } } }
    };

    if (charts.pop) charts.pop.destroy();
    charts.pop = new Chart(document.getElementById('chartPopulation'), {
        type: 'line',
        data: {
            labels: historyData.labels,
            datasets: [
                { label: 'Deer', data: historyData.deer, borderColor: DEER_COLOR, yAxisID: 'y' },
                { label: 'Lions', data: historyData.lions, borderColor: LION_COLOR, yAxisID: 'y' }
            ]
        },
        options: {
            ...commonOptions,
            scales: {
                x: { display: false },
                y: { type: 'linear', position: 'left', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    if (charts.climate) { charts.climate.destroy(); delete charts.climate; }
    if (charts.grass) charts.grass.destroy();
    charts.grass = new Chart(document.getElementById('chartGrass'), {
        type: 'line',
        data: {
            labels: historyData.labels,
            datasets: [
                { label: 'Grass Patches', data: historyData.grass, borderColor: GRASS_COLOR, backgroundColor: 'rgba(16,185,129,0.1)', fill: true }
            ]
        },
        options: {
            ...commonOptions,
            scales: {
                x: { display: false },
                y: { type: 'linear', position: 'left', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    if (charts.growth) charts.growth.destroy();
    charts.growth = new Chart(document.getElementById('chartGrowth'), {
        type: 'line',
        data: {
            labels: historyData.labels,
            datasets: [
                { label: 'Net Deer Δ', data: historyData.netDeer, borderColor: DEER_COLOR },
                { label: 'Net Lion Δ', data: historyData.netLion, borderColor: LION_COLOR }
            ]
        },
        options: {
            ...commonOptions,
            scales: {
                x: { display: false },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

function initSimulation() {
    canvas = document.getElementById('simCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    getParams();
    
    currentDay = 0;
    season = 'Wet';
    historyData = { labels: [], deer: [], lions: [], grass: [], seasonIndex: [], netDeer: [], netLion: [] };
    
    organisms.deer = [];
    organisms.lions = [];
    organisms.grass = [];

    organisms.deathEffects = [];

    for (let i = 0; i < params.initDeer; i++) {
        organisms.deer.push(new Deer(undefined, undefined, randomRange(0, 800)));
    }
    for (let i = 0; i < params.initLions; i++) {
        organisms.lions.push(new Lion(undefined, undefined, randomRange(0, 1200)));
    }
    for (let i = 0; i < params.initDeer * 1.5; i++) {
        organisms.grass.push(new Grass());
    }
    
    lastDeerCount = params.initDeer;
    lastLionCount = params.initLions;

    updateUI();
    initCharts();
}

function updateUI() {
    document.getElementById('stat-time').textContent = `${currentDay}d (${(currentDay / 365).toFixed(1)}y)`;
    
    const seasonEl = document.getElementById('stat-season');
    seasonEl.textContent = `${season} Season`;
    seasonEl.className = 'stat-value ' + (season === 'Wet' ? 'wet' : 'dry');
    

    document.getElementById('stat-deer').textContent = organisms.deer.length;
    document.getElementById('stat-lion').textContent = organisms.lions.length;
    document.getElementById('stat-grass').textContent = organisms.grass.length;
    
    document.getElementById('stat-quality').textContent = season === 'Wet' ? 'Lush (+35 E)' : 'Withered (+15 E)';
}

// --- Animation Loop ---

function animate() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw and update death effects
    for (let i = organisms.deathEffects.length - 1; i >= 0; i--) {
        let e = organisms.deathEffects[i];
        e.r += 1;
        e.alpha -= 0.05;
        if (e.alpha <= 0) {
            organisms.deathEffects.splice(i, 1);
            continue;
        }
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${e.alpha})`;
        ctx.stroke();
    }
    
    // Draw hiding spots — rocky outcrops (deer sanctuaries)
    for (let s of HIDING_SPOTS) {
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
    
    // Grass
    for (let g of organisms.grass) {
        g.draw(ctx);
    }
    
    let bornDeer = [];
    let bornLions = [];
    
    // Deer update & draw, eat grass
    for (let d of organisms.deer) {
        d.update();
        d.draw(ctx);
        
        // Eat grass — always foraging
        for (let i = organisms.grass.length - 1; i >= 0; i--) {
            if (distance(d, organisms.grass[i]) < 10) {
                d.foodEaten++;
                d.daysStarving = 0;
                organisms.grass.splice(i, 1);
                
                if (d.foodEaten >= params.deerFoodReq) {
                    d.foodEaten = 0;
                    bornDeer.push(new Deer(d.x + randomRange(-10, 10), d.y + randomRange(-10, 10), 0));
                }
                break; // Eat one per frame
            }
        }
    }
    
    // Lion update & draw, eat deer
    for (let l of organisms.lions) {
        l.update();
        l.draw(ctx);
        
        // Eat deer — always hunting
        for (let i = organisms.deer.length - 1; i >= 0; i--) {
            let d = organisms.deer[i];
            // Cannot kill deer sheltering in hiding spots
            if (inHidingSpot(d.x, d.y)) continue;
            if (distance(l, d) < 15) {
                // 100% deterministic hunt
                l.foodEaten++;
                l.daysSinceLastMeal = 0;
                organisms.deathEffects.push({x: d.x, y: d.y, r: 5, alpha: 1});
                d.dead = true;
                organisms.deer.splice(i, 1);
                
                if (l.foodEaten >= params.lionFoodReq) {
                    l.foodEaten = 0;
                    bornLions.push(new Lion(l.x + randomRange(-10, 10), l.y + randomRange(-10, 10), 0));
                }
                break;
            }
        }
    }
    
    organisms.deer.push(...bornDeer);
    organisms.lions.push(...bornLions);
    
    animationFrame = requestAnimationFrame(animate);
}

// --- Simulation Logic ---

function simulateGeneration() {
    currentDay++;
    
    // Season update
    let dayInCycle = currentDay % params.seasonLength;
    season = dayInCycle < (params.seasonLength / 2) ? 'Wet' : 'Dry';
    
    // Grass spawn
    let spawnRate = season === 'Wet' ? params.grassSpawn * 1.3 : params.grassSpawn * 0.25;
    for (let i = 0; i < spawnRate; i++) {
        if (organisms.grass.length >= 1500) break;
        // 50% cluster, 50% random
        if (Math.random() < 0.5 && organisms.grass.length > 0) {
            let parent = organisms.grass[Math.floor(Math.random() * organisms.grass.length)];
            organisms.grass.push(new Grass(parent.x + randomRange(-30, 30), parent.y + randomRange(-30, 30)));
        } else {
            organisms.grass.push(new Grass());
        }
    }
    

    
    // Process Deer
    for (let i = organisms.deer.length - 1; i >= 0; i--) {
        let d = organisms.deer[i];
        d.age++;
        
        // Daily starvation logic
        d.daysStarving++;
        
        if (d.daysStarving > params.deerStarvation) {
            organisms.deathEffects.push({x: d.x, y: d.y, r: 5, alpha: 1});
            organisms.deer.splice(i, 1);
        }
    }
    
    // Process Lions
    let lionCount = organisms.lions.length;
    for (let i = lionCount - 1; i >= 0; i--) {
        let l = organisms.lions[i];
        l.age++;
        
        l.daysSinceLastMeal++;
        
        if (l.daysSinceLastMeal > params.lionStarvation) {
            organisms.deathEffects.push({x: l.x, y: l.y, r: 5, alpha: 1});
            organisms.lions.splice(i, 1);
        }
    }
}

function runGenerationStep() {
    if (!isRunning || currentDay >= params.days) {
        if (currentDay >= params.days) stopSimulation();
        return;
    }
    
    simulateGeneration();
    updateUI();
    
    historyData.labels.push(currentDay);
    historyData.deer.push(organisms.deer.length);
    historyData.lions.push(organisms.lions.length);
    historyData.grass.push(organisms.grass.length);
    historyData.seasonIndex.push(season === 'Wet' ? 1 : 0);

    historyData.netDeer.push(organisms.deer.length - lastDeerCount);
    historyData.netLion.push(organisms.lions.length - lastLionCount);
    
    lastDeerCount = organisms.deer.length;
    lastLionCount = organisms.lions.length;
    
    if (charts.pop) charts.pop.update('none');
    if (charts.grass) charts.grass.update('none');
    if (charts.growth) charts.growth.update('none');
    
    simulationTimeout = setTimeout(runGenerationStep, SPEED);
}

// --- Controls ---

function startSimulation() {
    if (isRunning) return;
    initSimulation();
    isRunning = true;
    toggleInputs(false);
    animate();
    runGenerationStep();
}

function runInstant() {
    if (isRunning) stopSimulation();
    initSimulation();
    
    while (currentDay < params.days) {
        simulateGeneration();
        historyData.labels.push(currentDay);
        historyData.deer.push(organisms.deer.length);
        historyData.lions.push(organisms.lions.length);
        historyData.grass.push(organisms.grass.length);
        historyData.seasonIndex.push(season === 'Wet' ? 1 : 0);

        historyData.netDeer.push(organisms.deer.length - lastDeerCount);
        historyData.netLion.push(organisms.lions.length - lastLionCount);
        lastDeerCount = organisms.deer.length;
        lastLionCount = organisms.lions.length;
    }
    updateUI();
    if (charts.pop) charts.pop.update('none');
    if (charts.grass) charts.grass.update('none');
    if (charts.growth) charts.growth.update('none');
    toggleInputs(true);
}

function stopSimulation() {
    isRunning = false;
    clearTimeout(simulationTimeout);
    toggleInputs(true);
}

function resetSimulation() {
    stopSimulation();
    initSimulation();
}

function toggleInputs(enabled) {
    const inputs = document.querySelectorAll('.params-panel input');
    inputs.forEach(input => input.disabled = !enabled);
    document.getElementById('btnStart').disabled = !enabled;
    document.getElementById('btnInstant').disabled = !enabled;
}

// --- Interactions ---

document.getElementById('btnStart').addEventListener('click', startSimulation);
document.getElementById('btnInstant').addEventListener('click', runInstant);
document.getElementById('btnReset').addEventListener('click', resetSimulation);

document.getElementById('simCanvas')?.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    
    // Kill nearby entities (radius 20)
    for (let i = organisms.deer.length - 1; i >= 0; i--) {
        let d = organisms.deer[i];
        if (Math.hypot(d.x - clickX, d.y - clickY) < 20) {
            organisms.deathEffects.push({x: d.x, y: d.y, r: 5, alpha: 1});
            organisms.deer.splice(i, 1);
        }
    }
    for (let i = organisms.lions.length - 1; i >= 0; i--) {
        let l = organisms.lions[i];
        if (Math.hypot(l.x - clickX, l.y - clickY) < 20) {
            organisms.deathEffects.push({x: l.x, y: l.y, r: 5, alpha: 1});
            organisms.lions.splice(i, 1);
        }
    }
});

// Initialization on load
window.addEventListener('load', () => {
    initSimulation();
    // Start continuous animation loop (organisms move visually even before Run)
    animate();
});
