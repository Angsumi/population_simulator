document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const inputInitialPop = document.getElementById('initialPop');
    const inputGrowthRate = document.getElementById('growthRate');
    const inputCarryingCapacity = document.getElementById('carryingCapacity');
    const inputMaxGenerations = document.getElementById('maxGenerations');
    const btnStart = document.getElementById('btnStart');
    const btnInstant = document.getElementById('btnInstant');
    const btnReset = document.getElementById('btnReset');
    const valTime = document.getElementById('valTime');
    const valPopulation = document.getElementById('valPopulation');
    const valUtil = document.getElementById('valUtil');
    const valBirths = document.getElementById('valBirths');
    const valDeaths = document.getElementById('valDeaths');
    const speedSlider = document.getElementById('speedSlider');
    const speedVal = document.getElementById('speedVal');
    const simStatus = document.getElementById('simStatus');

    // Canvas Setup
    const canvas = document.getElementById('habitatCanvas');
    if (!canvas) {
        console.error("Canvas element 'habitatCanvas' not found!");
        return;
    }
    const ctxCanvas = canvas.getContext('2d');

    // Chart Setup (Population Chart)
    const canvasChart = document.getElementById('populationChart');
    if (!canvasChart) {
        console.error("Canvas element 'populationChart' not found!");
        return;
    }
    const ctxChart = canvasChart.getContext('2d');
    let populationChart = null;

    // Chart Setup (Per-Capita Rates Chart)
    const canvasRatesChart = document.getElementById('ratesChart');
    if (!canvasRatesChart) {
        console.error("Canvas element 'ratesChart' not found!");
        return;
    }
    const ctxRatesChart = canvasRatesChart.getContext('2d');
    let ratesChart = null;

    // Chart Setup (Total Rates Chart)
    const canvasTotalRatesChart = document.getElementById('totalRatesChart');
    if (!canvasTotalRatesChart) {
        console.error("Canvas element 'totalRatesChart' not found!");
        return;
    }
    const ctxTotalRatesChart = canvasTotalRatesChart.getContext('2d');
    let totalRatesChart = null;

    // Setup Canvas size
    function resizeCanvas() {
        if (canvas && canvas.parentElement) {
            const parentWidth = canvas.parentElement.clientWidth;
            canvas.width = Math.max(100, parentWidth - 40);
            canvas.height = Math.max(250, canvas.parentElement.clientHeight - 80) || 400;
        }
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Simulation State
    let simInterval = null;
    let currentGeneration = 0;
    let historyLabels = [];
    let historyPopData = [];
    let historyCapData = [];
    let historyGrowthRateData = [];
    let historyBirthRateData = [];
    let historyDeathRateData = [];
    let historyTotalBirthsData = [];
    let historyTotalDeathsData = [];

    // ─────────────────────────────────────────────────────────
    //  AGENT-BASED INDIVIDUAL ORGANISM
    //  Each organism is an independent agent with its own state.
    //  Births happen by "splitting" — child appears next to parent.
    //  Death is stochastic, density-dependent.
    // ─────────────────────────────────────────────────────────
    const MATURITY_AGE = 8;      // generations before an organism can reproduce
    const MAX_VISUAL = 600;       // max dots rendered on canvas for performance

    class Organism {
        constructor(x, y, age = 0) {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 1.8;
            this.vy = (Math.random() - 0.5) * 1.8;
            this.radius = Math.random() * 1.5 + 2.5;
            this.alpha = 0; // fade-in on birth
            this.age = age;
            this.alive = true;
        }

        update() {
            // Wander
            this.vx += (Math.random() - 0.5) * 0.3;
            this.vy += (Math.random() - 0.5) * 0.3;
            // Damping
            this.vx *= 0.96;
            this.vy *= 0.96;

            this.x += this.vx;
            this.y += this.vy;

            // Bounce off walls
            if (this.x < this.radius || this.x > canvas.width - this.radius) {
                this.vx *= -1;
                this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
            }
            if (this.y < this.radius || this.y > canvas.height - this.radius) {
                this.vy *= -1;
                this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
            }

            // Fade in
            if (this.alpha < 1) {
                this.alpha = Math.min(1, this.alpha + 0.15);
            }
        }

        draw(maxAge) {
            // Color: interpolate green → yellow → red based on age
            // Newborn = vivid green (16, 220, 96)
            // Old     = vivid red  (239, 60, 60)
            const lifeRatio = Math.min(1, this.age / Math.max(1, maxAge * 0.8));
            let r, g, b;
            if (lifeRatio < 0.5) {
                // Green → Yellow
                const t = lifeRatio * 2;
                r = Math.round(16 + (255 - 16) * t);
                g = Math.round(220 + (200 - 220) * t);
                b = Math.round(96 + (20 - 96) * t);
            } else {
                // Yellow → Red
                const t = (lifeRatio - 0.5) * 2;
                r = Math.round(255 + (239 - 255) * t);
                g = Math.round(200 + (60 - 200) * t);
                b = Math.round(20 + (60 - 20) * t);
            }

            ctxCanvas.beginPath();
            ctxCanvas.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctxCanvas.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.alpha})`;
            ctxCanvas.shadowBlur = 6;
            ctxCanvas.shadowColor = `rgba(${r}, ${g}, ${b}, 0.7)`;
            ctxCanvas.fill();
            ctxCanvas.shadowBlur = 0;
        }
    }

    // The actual population of simulated individuals
    // For large populations we track count separately and only render a visual sample
    let individuals = [];      // the real simulated population (capped for perf)
    let populationCount = 0;   // true population count (can exceed visual cap)

    // Spawn initial organisms spread across the canvas
    function spawnInitialPopulation(count) {
        individuals = [];
        populationCount = count;
        const visualCount = Math.min(count, MAX_VISUAL);
        for (let i = 0; i < visualCount; i++) {
            individuals.push(new Organism(
                Math.random() * (canvas.width - 20) + 10,
                Math.random() * (canvas.height - 20) + 10,
                Math.floor(Math.random() * MATURITY_AGE) // random starting ages
            ));
        }
    }

    // ─────────────────────────────────────────────────────────
    //  CORE SIMULATION STEP
    //  Every generation, each individual independently:
    //   - Has a chance to reproduce (birth by splitting)
    //   - Has a chance to die (density-dependent)
    //  All events are stochastic. Graphs plot REAL counts.
    // ─────────────────────────────────────────────────────────
    function simulateGeneration(r, k) {
        const pop = populationCount;
        if (pop <= 0) return { births: 0, deaths: 0, perCapitaBirthProb: 0, perCapitaDeathProb: 0 };

        // Symmetric decomposition of the logistic equation:
        //   Net growth = r * P * (1 - P/K)
        // Split into:
        //   Birth rate  b(P) = r * (1 - P/(2K))   — decreases with density
        //   Death rate  d(P) = r * P/(2K)          — increases with density
        //   b - d = r * (1 - P/K)  ✓ (standard logistic)
        //   At P = K:  b = r/2,  d = r/2  → equilibrium exactly at K ✓
        const densityRatio = pop / k;

        const perCapitaBirthProb = Math.max(0, Math.min(1, r * (1 - densityRatio / 2)));
        const perCapitaDeathProb = Math.max(0, Math.min(1, r * densityRatio / 2));

        // Simulate births and deaths stochastically
        // For small populations: exact per-individual coin flips
        // For large populations: binomial normal approximation for speed
        let births = 0;
        let deaths = 0;

        if (pop <= 500) {
            // Exact stochastic: flip a coin for each individual
            for (let i = 0; i < pop; i++) {
                if (Math.random() < perCapitaBirthProb) {
                    births++;
                }
                if (Math.random() < perCapitaDeathProb) {
                    deaths++;
                }
            }
        } else {
            // Binomial approximation via Normal(μ, σ²) for large populations
            const birthMean = pop * perCapitaBirthProb;
            const birthStd = Math.sqrt(pop * perCapitaBirthProb * (1 - perCapitaBirthProb));
            births = Math.max(0, Math.round(birthMean + boxMullerRandom() * birthStd));

            const deathMean = pop * perCapitaDeathProb;
            const deathStd = Math.sqrt(pop * perCapitaDeathProb * (1 - perCapitaDeathProb));
            deaths = Math.max(0, Math.round(deathMean + boxMullerRandom() * deathStd));
        }

        // Ensure we don't kill more than exist
        deaths = Math.min(deaths, pop);

        // Update true population count
        populationCount = pop + births - deaths;
        populationCount = Math.max(0, populationCount);

        // ─── Update visual organisms ───
        updateVisualOrganisms(births, deaths);

        return { births, deaths, perCapitaBirthProb, perCapitaDeathProb };
    }

    // Box-Muller transform for normal random numbers
    function boxMullerRandom() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    // ─────────────────────────────────────────────────────────
    //  VISUAL ORGANISM MANAGEMENT
    //  Births = splitting animation (child spawns next to parent)
    //  Deaths = remove oldest organisms
    // ─────────────────────────────────────────────────────────
    function updateVisualOrganisms(births, deaths) {
        const visualTarget = Math.min(populationCount, MAX_VISUAL);
        const scaleFactor = populationCount > 0 ? visualTarget / populationCount : 0;
        const visualBirths = Math.round(births * scaleFactor);
        const visualDeaths = Math.round(deaths * scaleFactor);

        // Age all living organisms
        for (const org of individuals) {
            org.age++;
        }

        // Kill oldest organisms first (simulating death of oldest)
        let toKill = Math.min(visualDeaths, individuals.length);
        if (toKill > 0) {
            // Sort by age descending, mark oldest as dead
            individuals.sort((a, b) => b.age - a.age);
            for (let i = 0; i < toKill; i++) {
                individuals[i].alive = false;
            }
            individuals = individuals.filter(o => o.alive);
        }

        // Birth by splitting: pick a random parent, spawn child nearby
        const birthsToAdd = Math.min(visualBirths, MAX_VISUAL - individuals.length);
        for (let i = 0; i < birthsToAdd; i++) {
            if (individuals.length === 0) {
                // Spontaneous if no visible parents
                individuals.push(new Organism(
                    Math.random() * (canvas.width - 20) + 10,
                    Math.random() * (canvas.height - 20) + 10,
                    0
                ));
            } else {
                // Pick random parent
                const parent = individuals[Math.floor(Math.random() * individuals.length)];
                // Child spawns near parent with small offset (splitting effect)
                const angle = Math.random() * Math.PI * 2;
                const dist = parent.radius * 3 + Math.random() * 8;
                const childX = Math.max(5, Math.min(canvas.width - 5, parent.x + Math.cos(angle) * dist));
                const childY = Math.max(5, Math.min(canvas.height - 5, parent.y + Math.sin(angle) * dist));
                const child = new Organism(childX, childY, 0);
                // Give child a slight push away from parent
                child.vx = Math.cos(angle) * 1.2;
                child.vy = Math.sin(angle) * 1.2;
                individuals.push(child);
            }
        }

        // If visual count drifted from target, adjust gently
        while (individuals.length > visualTarget + 5) {
            // Remove oldest excess
            let oldestIdx = 0;
            for (let i = 1; i < individuals.length; i++) {
                if (individuals[i].age > individuals[oldestIdx].age) oldestIdx = i;
            }
            individuals.splice(oldestIdx, 1);
        }
        while (individuals.length < visualTarget - 5 && individuals.length < MAX_VISUAL) {
            if (individuals.length > 0) {
                const parent = individuals[Math.floor(Math.random() * individuals.length)];
                const angle = Math.random() * Math.PI * 2;
                const dist = parent.radius * 3 + Math.random() * 8;
                const cx = Math.max(5, Math.min(canvas.width - 5, parent.x + Math.cos(angle) * dist));
                const cy = Math.max(5, Math.min(canvas.height - 5, parent.y + Math.sin(angle) * dist));
                individuals.push(new Organism(cx, cy, Math.floor(Math.random() * MATURITY_AGE)));
            } else {
                individuals.push(new Organism(
                    Math.random() * (canvas.width - 20) + 10,
                    Math.random() * (canvas.height - 20) + 10,
                    0
                ));
            }
        }
    }

    let deathEffects = [];

    // ─────────────────────────────────────────────────────────
    //  CANVAS ANIMATION LOOP
    // ─────────────────────────────────────────────────────────
    function animate() {
        ctxCanvas.fillStyle = '#0b0c15';
        ctxCanvas.fillRect(0, 0, canvas.width, canvas.height);

        // Draw habitat boundary
        ctxCanvas.strokeStyle = 'rgba(236, 72, 153, 0.15)';
        ctxCanvas.lineWidth = 1.5;
        ctxCanvas.setLineDash([5, 5]);
        ctxCanvas.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
        ctxCanvas.setLineDash([]);

        // Compute max age for color scaling
        let maxAge = 1;
        for (const org of individuals) {
            if (org.age > maxAge) maxAge = org.age;
        }

        // Update and draw each organism
        for (const org of individuals) {
            org.update();
            org.draw(maxAge);
        }

        // Update and draw death effects
        deathEffects = deathEffects.filter(effect => {
            effect.radius += 1.5;
            effect.alpha -= 0.08;
            
            ctxCanvas.beginPath();
            ctxCanvas.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
            ctxCanvas.strokeStyle = `rgba(239, 68, 68, ${effect.alpha})`;
            ctxCanvas.lineWidth = 2;
            ctxCanvas.stroke();
            
            return effect.alpha > 0;
        });

        // Population count overlay
        if (populationCount > 0) {
            ctxCanvas.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctxCanvas.font = 'bold 11px Outfit, sans-serif';
            ctxCanvas.textAlign = 'right';
            ctxCanvas.fillText(`Individuals: ${populationCount}`, canvas.width - 12, canvas.height - 10);
            ctxCanvas.textAlign = 'left';
        }

        requestAnimationFrame(animate);
    }
    animate();

    // Click handler to kill by cursor
    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
        const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

        const clickTolerance = 15;
        let killedCount = 0;

        individuals = individuals.filter(org => {
            const dist = Math.sqrt((org.x - x) ** 2 + (org.y - y) ** 2);
            if (dist < (org.radius + clickTolerance)) {
                killedCount++;
                org.alive = false;
                return false;
            }
            return true;
        });

        if (killedCount > 0) {
            populationCount = Math.max(0, populationCount - killedCount);
            valPopulation.textContent = Math.round(populationCount).toLocaleString();
            
            deathEffects.push({
                x: x,
                y: y,
                radius: 4,
                alpha: 1
            });
        }
    });

    // ─────────────────────────────────────────────────────────
    //  CHART INITIALIZATION
    // ─────────────────────────────────────────────────────────
    function initCharts(carryingCapacity, initialGrowthRate) {
        if (typeof Chart !== 'undefined') {
            // Main Population Chart
            if (populationChart) populationChart.destroy();

            populationChart = new Chart(ctxChart, {
                type: 'line',
                data: {
                    labels: historyLabels,
                    datasets: [
                        {
                            label: 'Population (P)',
                            data: historyPopData,
                            borderColor: '#6366f1',
                            backgroundColor: 'rgba(99, 102, 241, 0.08)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.25,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            pointBackgroundColor: '#6366f1',
                            pointBorderColor: '#fff',
                            yAxisID: 'y'
                        },
                        {
                            label: 'Net Growth (ΔP)',
                            data: historyGrowthRateData,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.04)',
                            borderWidth: 2.5,
                            fill: false,
                            tension: 0.25,
                            pointRadius: 0,
                            pointHoverRadius: 5,
                            pointBackgroundColor: '#10b981',
                            yAxisID: 'y1'
                        },
                        {
                            label: 'Carrying Capacity (K)',
                            data: historyCapData,
                            borderColor: '#ec4899',
                            borderDash: [6, 4],
                            borderWidth: 1.5,
                            fill: false,
                            pointRadius: 0,
                            pointHoverRadius: 0,
                            yAxisID: 'y'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#9ca3af',
                                font: { family: 'Outfit', size: 12 }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(7, 8, 13, 0.95)',
                            titleFont: { family: 'Outfit', size: 14 },
                            bodyFont: { family: 'Plus Jakarta Sans', size: 13 },
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                            borderWidth: 1,
                            padding: 12
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.04)' },
                            ticks: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans' } },
                            title: {
                                display: true,
                                text: 'Generations (t)',
                                color: '#9ca3af',
                                font: { family: 'Plus Jakarta Sans', size: 12 }
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            grid: { color: 'rgba(255, 255, 255, 0.04)' },
                            ticks: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans' } },
                            title: {
                                display: true,
                                text: 'Population Size',
                                color: '#6366f1',
                                font: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' }
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: { drawOnChartArea: false },
                            ticks: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans' } },
                            title: {
                                display: true,
                                text: 'Net Growth (ΔP / gen)',
                                color: '#10b981',
                                font: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' }
                            }
                        }
                    }
                }
            });

            // Per-Capita Rates Chart
            if (ratesChart) ratesChart.destroy();

            ratesChart = new Chart(ctxRatesChart, {
                type: 'line',
                data: {
                    labels: historyLabels,
                    datasets: [
                        {
                            label: 'Per-Capita Birth Rate (b)',
                            data: historyBirthRateData,
                            borderColor: '#3b82f6',
                            borderWidth: 2.5,
                            fill: false,
                            tension: 0.2,
                            pointRadius: 0,
                            pointHoverRadius: 5
                        },
                        {
                            label: 'Per-Capita Death Rate (d)',
                            data: historyDeathRateData,
                            borderColor: '#f97316',
                            borderWidth: 2.5,
                            fill: false,
                            tension: 0.2,
                            pointRadius: 0,
                            pointHoverRadius: 5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#9ca3af',
                                font: { family: 'Outfit', size: 12 }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(7, 8, 13, 0.95)',
                            titleFont: { family: 'Outfit', size: 14 },
                            bodyFont: { family: 'Plus Jakarta Sans', size: 13 },
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                            borderWidth: 1,
                            padding: 12
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.04)' },
                            ticks: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans' } },
                            title: {
                                display: true,
                                text: 'Generations (t)',
                                color: '#9ca3af',
                                font: { family: 'Plus Jakarta Sans', size: 12 }
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            suggestedMin: 0,
                            grid: { color: 'rgba(255, 255, 255, 0.04)' },
                            ticks: {
                                color: '#9ca3af',
                                font: { family: 'Plus Jakarta Sans' },
                                callback: function(value) {
                                    return (value * 100).toFixed(1) + '%';
                                }
                            },
                            title: {
                                display: true,
                                text: 'Rate per Capita (actual)',
                                color: '#9ca3af',
                                font: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' }
                            }
                        }
                    }
                }
            });

            // Total Rates Chart
            if (totalRatesChart) totalRatesChart.destroy();

            totalRatesChart = new Chart(ctxTotalRatesChart, {
                type: 'line',
                data: {
                    labels: historyLabels,
                    datasets: [
                        {
                            label: 'Total Births (B)',
                            data: historyTotalBirthsData,
                            borderColor: '#60a5fa',
                            backgroundColor: 'rgba(96, 165, 250, 0.04)',
                            borderWidth: 2.5,
                            fill: true,
                            tension: 0.2,
                            pointRadius: 0,
                            pointHoverRadius: 5
                        },
                        {
                            label: 'Total Deaths (D)',
                            data: historyTotalDeathsData,
                            borderColor: '#f97316',
                            backgroundColor: 'rgba(249, 115, 22, 0.04)',
                            borderWidth: 2.5,
                            fill: true,
                            tension: 0.2,
                            pointRadius: 0,
                            pointHoverRadius: 5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#9ca3af',
                                font: { family: 'Outfit', size: 12 }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(7, 8, 13, 0.95)',
                            titleFont: { family: 'Outfit', size: 14 },
                            bodyFont: { family: 'Plus Jakarta Sans', size: 13 },
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                            borderWidth: 1,
                            padding: 12
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.04)' },
                            ticks: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans' } },
                            title: {
                                display: true,
                                text: 'Generations (t)',
                                color: '#9ca3af',
                                font: { family: 'Plus Jakarta Sans', size: 12 }
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            suggestedMin: 0,
                            grid: { color: 'rgba(255, 255, 255, 0.04)' },
                            ticks: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans' } },
                            title: {
                                display: true,
                                text: 'Total Individuals / gen (actual)',
                                color: '#9ca3af',
                                font: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' }
                            }
                        }
                    }
                }
            });

        } else {
            drawFallbackChart(carryingCapacity, initialGrowthRate);
        }
    }

    // ─────────────────────────────────────────────────────────
    //  FALLBACK CHART (offline / no Chart.js)
    // ─────────────────────────────────────────────────────────
    function drawFallbackChart(carryingCapacity, initialGrowthRate) {
        const maxGen = Math.max(10, parseInt(inputMaxGenerations.value) || 100);
        canvasChart.width = canvasChart.parentElement.clientWidth;
        canvasChart.height = Math.max(280, canvasChart.parentElement.clientHeight || 280);

        canvasRatesChart.width = canvasRatesChart.parentElement.clientWidth;
        canvasRatesChart.height = Math.max(280, canvasRatesChart.parentElement.clientHeight || 280);

        canvasTotalRatesChart.width = canvasTotalRatesChart.parentElement.clientWidth;
        canvasTotalRatesChart.height = Math.max(280, canvasTotalRatesChart.parentElement.clientHeight || 280);

        const padding = 40;
        const graphW = canvasChart.width - padding * 2;
        const graphH = canvasChart.height - padding * 2;

        // --- DRAW MAIN POPULATION CHART ---
        const ctxPop = ctxChart;
        ctxPop.fillStyle = '#0b0c15';
        ctxPop.fillRect(0, 0, canvasChart.width, canvasChart.height);
        ctxPop.fillStyle = 'rgba(239, 68, 68, 0.8)';
        ctxPop.font = '12px Outfit, sans-serif';
        ctxPop.fillText('Offline Mode (Chart.js failed to load)', 20, 25);

        // Grid lines
        ctxPop.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctxPop.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (graphH * i / 4);
            ctxPop.beginPath();
            ctxPop.moveTo(padding, y);
            ctxPop.lineTo(canvasChart.width - padding, y);
            ctxPop.stroke();
        }

        const maxVal = Math.max(carryingCapacity * 1.2, ...historyPopData, 100);
        const maxGrowthVal = Math.max(...historyGrowthRateData, 5);

        // Carrying capacity line
        const capY = padding + graphH - ((carryingCapacity / maxVal) * graphH);
        ctxPop.strokeStyle = '#ec4899';
        ctxPop.lineWidth = 1.5;
        ctxPop.setLineDash([5, 5]);
        ctxPop.beginPath();
        ctxPop.moveTo(padding, capY);
        ctxPop.lineTo(canvasChart.width - padding, capY);
        ctxPop.stroke();
        ctxPop.setLineDash([]);
        ctxPop.fillStyle = '#ec4899';
        ctxPop.fillText(`Capacity K (${carryingCapacity})`, canvasChart.width - padding - 120, capY - 5);

        // Pop Line
        if (historyPopData.length > 0) {
            ctxPop.strokeStyle = '#6366f1';
            ctxPop.lineWidth = 3;
            ctxPop.beginPath();
            for (let i = 0; i < historyPopData.length; i++) {
                const x = padding + (i / maxGen) * graphW;
                const y = padding + graphH - ((historyPopData[i] / maxVal) * graphH);
                if (i === 0) ctxPop.moveTo(x, y);
                else ctxPop.lineTo(x, y);
            }
            ctxPop.stroke();
        }

        // Growth Line
        if (historyGrowthRateData.length > 0) {
            ctxPop.strokeStyle = '#10b981';
            ctxPop.lineWidth = 2;
            ctxPop.beginPath();
            for (let i = 0; i < historyGrowthRateData.length; i++) {
                const x = padding + (i / maxGen) * graphW;
                const y = padding + graphH - ((historyGrowthRateData[i] / maxGrowthVal) * graphH);
                if (i === 0) ctxPop.moveTo(x, y);
                else ctxPop.lineTo(x, y);
            }
            ctxPop.stroke();
        }

        // --- PER-CAPITA RATES ---
        const ctxRate = ctxRatesChart;
        ctxRate.fillStyle = '#0b0c15';
        ctxRate.fillRect(0, 0, canvasRatesChart.width, canvasRatesChart.height);
        ctxRate.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctxRate.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (graphH * i / 4);
            ctxRate.beginPath();
            ctxRate.moveTo(padding, y);
            ctxRate.lineTo(canvasRatesChart.width - padding, y);
            ctxRate.stroke();
        }
        const maxRateVal = Math.max(initialGrowthRate * 1.5, ...historyDeathRateData, 0.1);
        if (historyBirthRateData.length > 0) {
            ctxRate.strokeStyle = '#3b82f6';
            ctxRate.lineWidth = 2.5;
            ctxRate.beginPath();
            for (let i = 0; i < historyBirthRateData.length; i++) {
                const x = padding + (i / maxGen) * graphW;
                const y = padding + graphH - ((historyBirthRateData[i] / maxRateVal) * graphH);
                if (i === 0) ctxRate.moveTo(x, y);
                else ctxRate.lineTo(x, y);
            }
            ctxRate.stroke();
        }
        if (historyDeathRateData.length > 0) {
            ctxRate.strokeStyle = '#f97316';
            ctxRate.lineWidth = 2.5;
            ctxRate.beginPath();
            for (let i = 0; i < historyDeathRateData.length; i++) {
                const x = padding + (i / maxGen) * graphW;
                const y = padding + graphH - ((historyDeathRateData[i] / maxRateVal) * graphH);
                if (i === 0) ctxRate.moveTo(x, y);
                else ctxRate.lineTo(x, y);
            }
            ctxRate.stroke();
        }

        // --- TOTAL RATES ---
        const ctxTotalRate = ctxTotalRatesChart;
        ctxTotalRate.fillStyle = '#0b0c15';
        ctxTotalRate.fillRect(0, 0, canvasTotalRatesChart.width, canvasTotalRatesChart.height);
        ctxTotalRate.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctxTotalRate.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (graphH * i / 4);
            ctxTotalRate.beginPath();
            ctxTotalRate.moveTo(padding, y);
            ctxTotalRate.lineTo(canvasTotalRatesChart.width - padding, y);
            ctxTotalRate.stroke();
        }
        const maxTotalRateVal = Math.max(carryingCapacity * initialGrowthRate * 1.2, ...historyTotalBirthsData, ...historyTotalDeathsData, 10);
        if (historyTotalBirthsData.length > 0) {
            ctxTotalRate.strokeStyle = '#60a5fa';
            ctxTotalRate.lineWidth = 2.5;
            ctxTotalRate.beginPath();
            for (let i = 0; i < historyTotalBirthsData.length; i++) {
                const x = padding + (i / maxGen) * graphW;
                const y = padding + graphH - ((historyTotalBirthsData[i] / maxTotalRateVal) * graphH);
                if (i === 0) ctxTotalRate.moveTo(x, y);
                else ctxTotalRate.lineTo(x, y);
            }
            ctxTotalRate.stroke();
        }
        if (historyTotalDeathsData.length > 0) {
            ctxTotalRate.strokeStyle = '#f97316';
            ctxTotalRate.lineWidth = 2.5;
            ctxTotalRate.beginPath();
            for (let i = 0; i < historyTotalDeathsData.length; i++) {
                const x = padding + (i / maxGen) * graphW;
                const y = padding + graphH - ((historyTotalDeathsData[i] / maxTotalRateVal) * graphH);
                if (i === 0) ctxTotalRate.moveTo(x, y);
                else ctxTotalRate.lineTo(x, y);
            }
            ctxTotalRate.stroke();
        }
    }

    // Speed slider listener
    speedSlider.addEventListener('input', () => {
        speedVal.textContent = `${speedSlider.value}ms / generation`;
    });

    // ─────────────────────────────────────────────────────────
    //  RUN SIMULATION (step-by-step, animated)
    // ─────────────────────────────────────────────────────────
    function startSimulation() {
        resetSimulation();

        // Lock Inputs
        inputInitialPop.disabled = true;
        inputGrowthRate.disabled = true;
        inputCarryingCapacity.disabled = true;
        inputMaxGenerations.disabled = true;
        btnStart.disabled = true;
        btnInstant.disabled = true;
        btnReset.disabled = false;

        simStatus.textContent = 'Running';
        simStatus.className = 'badge running';

        const p0 = Math.max(1, Math.round(parseFloat(inputInitialPop.value) || 10));
        const k = parseFloat(inputCarryingCapacity.value) || 500;
        const r = parseFloat(inputGrowthRate.value) || 0.1;

        currentGeneration = 0;
        spawnInitialPopulation(p0);

        initCharts(k, r);
        runGenerationStep();
    }

    function runGenerationStep() {
        const maxGen = Math.max(10, parseInt(inputMaxGenerations.value) || 100);
        if (currentGeneration > maxGen || populationCount <= 0) {
            completeSimulation();
            return;
        }

        const r = parseFloat(inputGrowthRate.value) || 0.1;
        const k = parseFloat(inputCarryingCapacity.value) || 500;

        // Record state BEFORE the generation step
        const popBefore = populationCount;

        if (currentGeneration === 0) {
            // Generation 0: just record initial state, no births/deaths yet
            historyLabels.push(0);
            historyPopData.push(popBefore);
            historyCapData.push(k);
            historyGrowthRateData.push(0);
            historyBirthRateData.push(0);
            historyDeathRateData.push(0);
            historyTotalBirthsData.push(0);
            historyTotalDeathsData.push(0);
        } else {
            // Simulate one generation — real stochastic events
            const result = simulateGeneration(r, k);
            const netGrowth = result.births - result.deaths;

            // Per-capita rates from ACTUAL events
            const actualBirthRate = popBefore > 0 ? result.births / popBefore : 0;
            const actualDeathRate = popBefore > 0 ? result.deaths / popBefore : 0;

            historyLabels.push(currentGeneration);
            historyPopData.push(populationCount);
            historyCapData.push(k);
            historyGrowthRateData.push(netGrowth);
            historyBirthRateData.push(Math.round(actualBirthRate * 1000) / 1000);
            historyDeathRateData.push(Math.round(actualDeathRate * 1000) / 1000);
            historyTotalBirthsData.push(result.births);
            historyTotalDeathsData.push(result.deaths);

            // Update births/deaths stats
            valBirths.textContent = result.births.toLocaleString();
            valDeaths.textContent = result.deaths.toLocaleString();
        }

        // Update UI Stats
        valTime.textContent = currentGeneration;
        valPopulation.textContent = populationCount.toLocaleString();
        const capacityPct = Math.min(100, Math.round((populationCount / k) * 100));
        valUtil.textContent = `${capacityPct}%`;

        // Update Charts
        if (typeof Chart !== 'undefined') {
            if (populationChart) populationChart.update('none');
            if (ratesChart) ratesChart.update('none');
            if (totalRatesChart) totalRatesChart.update('none');
        } else {
            drawFallbackChart(k, r);
        }

        currentGeneration++;
        const intervalSpeed = parseInt(speedSlider.value);
        simInterval = setTimeout(runGenerationStep, intervalSpeed);
    }

    // ─────────────────────────────────────────────────────────
    //  RUN INSTANTLY (all generations at once)
    // ─────────────────────────────────────────────────────────
    function runInstant() {
        resetSimulation();

        inputInitialPop.disabled = true;
        inputGrowthRate.disabled = true;
        inputCarryingCapacity.disabled = true;
        inputMaxGenerations.disabled = true;
        btnStart.disabled = true;
        btnInstant.disabled = true;
        btnReset.disabled = false;

        const p0 = Math.max(1, Math.round(parseFloat(inputInitialPop.value) || 10));
        const r = parseFloat(inputGrowthRate.value) || 0.1;
        const k = parseFloat(inputCarryingCapacity.value) || 500;

        spawnInitialPopulation(p0);

        // Generation 0
        historyLabels.push(0);
        historyPopData.push(populationCount);
        historyCapData.push(k);
        historyGrowthRateData.push(0);
        historyBirthRateData.push(0);
        historyDeathRateData.push(0);
        historyTotalBirthsData.push(0);
        historyTotalDeathsData.push(0);

        const maxGen = Math.max(10, parseInt(inputMaxGenerations.value) || 100);
        for (let t = 1; t <= maxGen; t++) {
            const popBefore = populationCount;
            const result = simulateGeneration(r, k);
            const netGrowth = result.births - result.deaths;
            const actualBirthRate = popBefore > 0 ? result.births / popBefore : 0;
            const actualDeathRate = popBefore > 0 ? result.deaths / popBefore : 0;

            historyLabels.push(t);
            historyPopData.push(populationCount);
            historyCapData.push(k);
            historyGrowthRateData.push(netGrowth);
            historyBirthRateData.push(Math.round(actualBirthRate * 1000) / 1000);
            historyDeathRateData.push(Math.round(actualDeathRate * 1000) / 1000);
            historyTotalBirthsData.push(result.births);
            historyTotalDeathsData.push(result.deaths);

            if (populationCount <= 0) break;
        }

        // End values update
        const lastIdx = historyPopData.length - 1;
        valTime.textContent = historyLabels[lastIdx];
        valPopulation.textContent = historyPopData[lastIdx].toLocaleString();
        const capacityPct = Math.min(100, Math.round((historyPopData[lastIdx] / k) * 100));
        valUtil.textContent = `${capacityPct}%`;
        valBirths.textContent = historyTotalBirthsData[lastIdx].toLocaleString();
        valDeaths.textContent = historyTotalDeathsData[lastIdx].toLocaleString();

        initCharts(k, r);
        if (typeof Chart !== 'undefined') {
            if (populationChart) populationChart.update();
            if (ratesChart) ratesChart.update();
            if (totalRatesChart) totalRatesChart.update();
        } else {
            drawFallbackChart(k, r);
        }
        completeSimulation();
    }

    function completeSimulation() {
        clearTimeout(simInterval);
        simStatus.textContent = populationCount <= 0 ? 'Extinct' : 'Stabilized';
        simStatus.className = populationCount <= 0 ? 'badge extinct' : 'badge completed';
        btnStart.disabled = true;
        btnInstant.disabled = true;
    }

    function resetSimulation() {
        clearTimeout(simInterval);

        historyLabels = [];
        historyPopData = [];
        historyCapData = [];
        historyGrowthRateData = [];
        historyBirthRateData = [];
        historyDeathRateData = [];
        historyTotalBirthsData = [];
        historyTotalDeathsData = [];

        inputInitialPop.disabled = false;
        inputGrowthRate.disabled = false;
        inputCarryingCapacity.disabled = false;
        inputMaxGenerations.disabled = false;
        btnStart.disabled = false;
        btnInstant.disabled = false;
        btnReset.disabled = true;

        valTime.textContent = '0';
        valPopulation.textContent = '0';
        valUtil.textContent = '0%';
        valBirths.textContent = '0';
        valDeaths.textContent = '0';

        simStatus.textContent = 'Idle';
        simStatus.className = 'badge';

        individuals = [];
        populationCount = 0;

        const k = parseFloat(inputCarryingCapacity.value) || 500;
        const r = parseFloat(inputGrowthRate.value) || 0.1;
        initCharts(k, r);
    }

    // Attach Event Listeners
    btnStart.addEventListener('click', startSimulation);
    btnInstant.addEventListener('click', runInstant);
    btnReset.addEventListener('click', resetSimulation);

    // Initial default chart load
    resetSimulation();
});
