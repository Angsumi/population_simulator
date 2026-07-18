document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const inputInitialPop = document.getElementById('initialPop');
    const inputInitialPred = document.getElementById('initialPred');
    const inputFoodSpawnRate = document.getElementById('foodSpawnRate');
    const inputSeasonLength = document.getElementById('seasonLength');
    const inputSurvivalCost = document.getElementById('survivalCost');
    const inputPredatorSurvivalCost = document.getElementById('predatorSurvivalCost');
    const inputHerbivoreSplitThreshold = document.getElementById('herbivoreSplitThreshold');
    const inputPredatorSplitThreshold = document.getElementById('predatorSplitThreshold');
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
    let historyHerbData = [];
    let historyPredData = [];
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
        constructor(x, y, type = 'herbivore', age = 0, energy = 100) {
            this.x = x;
            this.y = y;
            this.type = type; // 'herbivore' or 'predator'
            this.vx = (Math.random() - 0.5) * 1.8;
            this.vy = (Math.random() - 0.5) * 1.8;
            this.radius = type === 'predator' ? 5.5 : 3.5;
            this.alpha = 0; // fade-in on birth
            this.age = age;
            this.energy = energy;
            this.alive = true;
        }

        update() {
            // Wander base force
            this.vx += (Math.random() - 0.5) * 0.65;
            this.vy += (Math.random() - 0.5) * 0.65;

            if (this.type === 'herbivore') {
                // Herbivore Satiation: Satiated when energy > 90% of user-configured split energy (conserves grass)
                const herbSplitVal = parseFloat(inputHerbivoreSplitThreshold.value) || 135;
                const isSatiated = this.energy > (herbSplitVal * 0.9);

                // Steer towards nearest grass within 60px if not satiated
                if (!isSatiated && foodItems && foodItems.length > 0) {
                    let nearestFood = null;
                    let minDistSq = 60 * 60;
                    
                    for (let i = 0; i < foodItems.length; i++) {
                        const food = foodItems[i];
                        const dx = food.x - this.x;
                        const dy = food.y - this.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < minDistSq) {
                            minDistSq = distSq;
                            nearestFood = food;
                        }
                    }
                    
                    if (nearestFood) {
                        const dist = Math.sqrt(minDistSq);
                        if (dist > 0.1) {
                            this.vx += (nearestFood.x - this.x) / dist * 0.55;
                            this.vy += (nearestFood.y - this.y) / dist * 0.55;
                        }
                    }
                }
            } else if (this.type === 'predator') {
                // Predator Satiation: Satiated when energy > 85% of user-configured split energy (prey recovery time)
                const predSplitVal = parseFloat(inputPredatorSplitThreshold.value) || 160;
                const isSatiated = this.energy > (predSplitVal * 0.85);
                
                if (!isSatiated) {
                    // Steer towards nearest Herbivore within 110px (slightly larger chase window)
                    let nearestPrey = null;
                    let minDistSq = 110 * 110;
                    
                    for (let i = 0; i < individuals.length; i++) {
                        const other = individuals[i];
                        if (other.type === 'herbivore' && other.alive) {
                            // Prey Camouflage Refuge: Prey in the bottom-center forest (35%-65% width, >60% height) are invisible to predators
                            const inRefuge = (other.x > canvas.width * 0.35 && other.x < canvas.width * 0.65 && other.y > canvas.height * 0.6 && other.y < canvas.height - 10);
                            if (inRefuge) continue;

                            const dx = other.x - this.x;
                            const dy = other.y - this.y;
                            const distSq = dx * dx + dy * dy;
                            if (distSq < minDistSq) {
                                minDistSq = distSq;
                                nearestPrey = other;
                            }
                        }
                    }

                    if (nearestPrey) {
                        const dist = Math.sqrt(minDistSq);
                        if (dist > 0.1) {
                            // Steer slightly slower (0.5) to give prey a chasing chance
                            this.vx += (nearestPrey.x - this.x) / dist * 0.5;
                            this.vy += (nearestPrey.y - this.y) / dist * 0.5;
                        }
                    }
                }
            }

            // Damping
            this.vx *= 0.965;
            this.vy *= 0.965;

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

        draw() {
            let r = 59, g = 130, b = 246; // Herbivore Blue
            if (this.type === 'predator') {
                r = 239; g = 68; b = 68; // Predator Red
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

    let foodItems = [];

    // Spawn initial organisms spread across the canvas
    function spawnInitialPopulation(herbivoreCount, predatorCount) {
        individuals = [];
        foodItems = [];
        
        // Spawn initial herbivores
        for (let i = 0; i < herbivoreCount; i++) {
            individuals.push(new Organism(
                Math.random() * (canvas.width - 20) + 10,
                Math.random() * (canvas.height - 20) + 10,
                'herbivore',
                Math.floor(Math.random() * MATURITY_AGE),
                100
            ));
        }

        // Spawn initial predators
        for (let i = 0; i < predatorCount; i++) {
            individuals.push(new Organism(
                Math.random() * (canvas.width - 20) + 10,
                Math.random() * (canvas.height - 20) + 10,
                'predator',
                Math.floor(Math.random() * MATURITY_AGE),
                120
            ));
        }

        populationCount = individuals.length;

        // Spawn some initial food dots
        const initialFood = Math.round(herbivoreCount * 1.5);
        for (let i = 0; i < initialFood; i++) {
            foodItems.push({
                x: Math.random() * (canvas.width - 20) + 10,
                y: Math.random() * (canvas.height - 20) + 10
            });
        }
    }

    // ─────────────────────────────────────────────────────────
    //  CORE SIMULATION STEP (Resource Dynamics Model)
    //  No global K is used. Instead:
    //   - Food regenerates at foodSpawnRate per generation.
    //   - Organisms wander and eat food to gain nutritiveValue energy.
    //   - Every generation, organisms consume survivalCost energy.
    //   - If energy <= 0, they die. If energy >= 180, they split.
    // ─────────────────────────────────────────────────────────
    function simulateGeneration(baseFoodSpawnRate, seasonLength, herbivoreCost, predatorCost) {
        const pop = individuals.length;
        if (pop <= 0) return { births: 0, deaths: 0, perCapitaBirthProb: 0, perCapitaDeathProb: 0 };

        const nutritiveValue = 45;
        const predatorNutritiveValue = 85;

        // Dynamic Energy Caps: Scale caps with the user's split thresholds to prevent starvation/split blocks
        const herbSplitVal = parseFloat(inputHerbivoreSplitThreshold.value) || 135;
        const predSplitVal = parseFloat(inputPredatorSplitThreshold.value) || 160;
        const herbEnergyCap = herbSplitVal + nutritiveValue * 2;
        const predEnergyCap = predSplitVal + predatorNutritiveValue * 2;

        // 1. Calculate current seasonal food spawn rate
        const phase = (2 * Math.PI * currentGeneration) / (seasonLength || 60);
        const seasonalSpawnRate = Math.max(0, Math.round(baseFoodSpawnRate * (1 + Math.sin(phase))));

        // Spawn new food dots logistically (clustered seed dispersal + random colonization)
        const maxFood = 1200;
        for (let i = 0; i < seasonalSpawnRate; i++) {
            if (foodItems.length < maxFood) {
                if (foodItems.length > 0 && Math.random() < 0.75) {
                    const parent = foodItems[Math.floor(Math.random() * foodItems.length)];
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * 20 + 8;
                    const x = Math.max(10, Math.min(canvas.width - 10, parent.x + Math.cos(angle) * dist));
                    const y = Math.max(10, Math.min(canvas.height - 10, parent.y + Math.sin(angle) * dist));
                    foodItems.push({ x, y });
                } else {
                    foodItems.push({
                        x: Math.random() * (canvas.width - 20) + 10,
                        y: Math.random() * (canvas.height - 20) + 10
                    });
                }
            }
        }

        // To make movement and eating continuous, we simulate 10 substeps of movement and feeding per generation tick.
        const SUBSTEPS = 10;
        for (let step = 0; step < SUBSTEPS; step++) {
            // Update all positions first
            for (let i = 0; i < individuals.length; i++) {
                if (individuals[i].alive) {
                    individuals[i].update();
                }
            }

            // Herbivores eat grass
            for (let i = 0; i < individuals.length; i++) {
                const org = individuals[i];
                if (org.alive && org.type === 'herbivore') {
                    const isSatiated = org.energy > (herbSplitVal * 0.9);
                    if (isSatiated) continue;

                    const eatRadius = org.radius + 8;
                    for (let j = foodItems.length - 1; j >= 0; j--) {
                        const food = foodItems[j];
                        const dx = org.x - food.x;
                        const dy = org.y - food.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < eatRadius * eatRadius) {
                            org.energy = Math.min(herbEnergyCap, org.energy + nutritiveValue);
                            foodItems.splice(j, 1);
                            break; // eat one food item per substep
                        }
                    }
                }
            }

            // Predators eat herbivores
            for (let i = 0; i < individuals.length; i++) {
                const pred = individuals[i];
                if (pred.alive && pred.type === 'predator') {
                    const eatRadius = pred.radius + 8;
                    for (let j = 0; j < individuals.length; j++) {
                        const prey = individuals[j];
                        if (prey.alive && prey.type === 'herbivore') {
                            const dx = pred.x - prey.x;
                            const dy = pred.y - prey.y;
                            const distSq = dx * dx + dy * dy;
                            if (distSq < eatRadius * eatRadius) {
                                prey.alive = false;
                                prey.energy = 0;
                                pred.energy = Math.min(predEnergyCap, pred.energy + predatorNutritiveValue);
                                break; // eat one prey item per substep
                            }
                        }
                    }
                }
            }
        }

        // 2. Individuals consume energy, check for starvation, and split
        let births = 0;
        let deaths = 0;

        const deadIndices = new Set();
        const newborns = [];

        for (let i = 0; i < individuals.length; i++) {
            const org = individuals[i];
            
            if (!org.alive) {
                deadIndices.add(i);
                deaths++;
                continue;
            }

            org.age++;
            const cost = org.type === 'predator' ? predatorCost : herbivoreCost;
            org.energy -= cost;

            // Check for starvation death
            if (org.energy <= 0) {
                deadIndices.add(i);
                deaths++;
                org.alive = false;
                continue;
            }

            // Check for birth by splitting (User-configurable thresholds in Level 5.2)
            const herbSplitVal = parseFloat(inputHerbivoreSplitThreshold.value) || 135;
            const predSplitVal = parseFloat(inputPredatorSplitThreshold.value) || 160;
            const splitThreshold = org.type === 'predator' ? predSplitVal : herbSplitVal;
            if (org.energy >= splitThreshold) {
                births++;
                org.energy = Math.round(org.energy / 2); // Split energy

                const angle = Math.random() * Math.PI * 2;
                const dist = org.radius * 3 + Math.random() * 8;
                const childX = Math.max(5, Math.min(canvas.width - 5, org.x + Math.cos(angle) * dist));
                const childY = Math.max(5, Math.min(canvas.height - 5, org.y + Math.sin(angle) * dist));
                
                const child = new Organism(childX, childY, org.type, 0, org.energy);
                child.vx = Math.cos(angle) * 1.5;
                child.vy = Math.sin(angle) * 1.5;
                newborns.push(child);
            }
        }

        // Filter out dead organisms
        individuals = individuals.filter((org, index) => !deadIndices.has(index));

        // Add newborns
        const maxCapacityCap = 1500;
        const birthsToAdd = Math.min(newborns.length, maxCapacityCap - individuals.length);
        for (let i = 0; i < birthsToAdd; i++) {
            individuals.push(newborns[i]);
        }

        populationCount = individuals.length;

        // Calculate average birth probability (splitting rate)
        // and average death probability (starvation rate)
        const perCapitaBirthProb = births / Math.max(1, pop);
        const perCapitaDeathProb = deaths / Math.max(1, pop);

        return { births, deaths, perCapitaBirthProb, perCapitaDeathProb };
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

        // Draw Prey Refuge Zone (bottom-center Camouflage Forest)
        const forestY = canvas.height * 0.6;
        const forestH = canvas.height * 0.4 - 10;
        ctxCanvas.fillStyle = 'rgba(16, 185, 129, 0.03)';
        ctxCanvas.fillRect(canvas.width * 0.35, forestY, canvas.width * 0.3, forestH);
        ctxCanvas.strokeStyle = 'rgba(16, 185, 129, 0.08)';
        ctxCanvas.lineWidth = 1;
        ctxCanvas.strokeRect(canvas.width * 0.35, forestY, canvas.width * 0.3, forestH);
        
        ctxCanvas.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctxCanvas.font = 'bold 9px Outfit, sans-serif';
        ctxCanvas.fillText('CAMOUFLAGE BRUSH (SAFE ZONE)', canvas.width * 0.35 + 10, forestY + 20);

        // Draw food items
        for (const food of foodItems) {
            ctxCanvas.beginPath();
            ctxCanvas.arc(food.x, food.y, 2.5, 0, Math.PI * 2);
            ctxCanvas.fillStyle = '#10b981';
            ctxCanvas.shadowBlur = 4;
            ctxCanvas.shadowColor = '#10b981';
            ctxCanvas.fill();
            ctxCanvas.shadowBlur = 0;
        }

        // Real-time eating collision checks for animation frames
        const nutritiveValue = 45;
        const predatorNutritiveValue = 85;

        const herbSplitVal = parseFloat(inputHerbivoreSplitThreshold.value) || 135;
        const predSplitVal = parseFloat(inputPredatorSplitThreshold.value) || 160;
        const herbEnergyCap = herbSplitVal + nutritiveValue * 2;
        const predEnergyCap = predSplitVal + predatorNutritiveValue * 2;

        // Herbivores graze grass
        for (const org of individuals) {
            if (org.alive && org.type === 'herbivore') {
                const isSatiated = org.energy > (herbSplitVal * 0.9);
                if (isSatiated) continue;

                const eatRadius = org.radius + 8;
                for (let j = foodItems.length - 1; j >= 0; j--) {
                    const food = foodItems[j];
                    const dx = org.x - food.x;
                    const dy = org.y - food.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < eatRadius * eatRadius) {
                        org.energy = Math.min(herbEnergyCap, org.energy + nutritiveValue);
                        foodItems.splice(j, 1);
                        break;
                    }
                }
            }
        }

        // Predators hunt herbivores
        for (const pred of individuals) {
            if (pred.alive && pred.type === 'predator') {
                const eatRadius = pred.radius + 8;
                for (const prey of individuals) {
                    if (prey.alive && prey.type === 'herbivore') {
                        const dx = pred.x - prey.x;
                        const dy = pred.y - prey.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < eatRadius * eatRadius) {
                            prey.alive = false;
                            prey.energy = 0;
                            pred.energy = Math.min(predEnergyCap, pred.energy + predatorNutritiveValue);
                            
                            // Visual death effect
                            deathEffects.push({
                                x: prey.x,
                                y: prey.y,
                                radius: 4,
                                alpha: 0.6
                            });
                            break;
                        }
                    }
                }
            }
        }

        // Update and draw each organism
        for (const org of individuals) {
            if (org.alive) {
                org.update();
                org.draw();
            }
        }

        // Clean up dead individuals eaten in real-time
        individuals = individuals.filter(org => org.alive);

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
        const hCount = individuals.filter(o => o.type === 'herbivore').length;
        const pCount = individuals.filter(o => o.type === 'predator').length;
        populationCount = individuals.length;

        if (populationCount > 0) {
            ctxCanvas.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctxCanvas.font = 'bold 11px Outfit, sans-serif';
            ctxCanvas.textAlign = 'right';
            ctxCanvas.fillText(`Herbivores: ${hCount}  |  Predators: ${pCount}`, canvas.width - 12, canvas.height - 10);
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
                            label: 'Herbivores (Blue)',
                            data: historyHerbData,
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.05)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.25,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            pointBackgroundColor: '#3b82f6',
                            pointBorderColor: '#fff',
                            yAxisID: 'y'
                        },
                        {
                            label: 'Predators (Red)',
                            data: historyPredData,
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.05)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.25,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            pointBackgroundColor: '#ef4444',
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

    // Calculate theoretical emergent carrying capacity (average across seasonal cycles for Herbivores)
    function getEmergentK() {
        const spawnRate = parseFloat(inputFoodSpawnRate.value) || 60;
        const nutritiveValue = 45; // Fixed energy value
        const survivalCost = parseFloat(inputSurvivalCost.value) || 5;
        if (survivalCost <= 0) return 1;
        return Math.max(1, Math.round((spawnRate * nutritiveValue) / survivalCost));
    }

    // ─────────────────────────────────────────────────────────
    //  RUN SIMULATION (step-by-step, animated)
    // ─────────────────────────────────────────────────────────
    function startSimulation() {
        resetSimulation();

        // Lock Inputs
        inputInitialPop.disabled = true;
        inputInitialPred.disabled = true;
        inputFoodSpawnRate.disabled = true;
        inputSeasonLength.disabled = true;
        inputSurvivalCost.disabled = true;
        inputPredatorSurvivalCost.disabled = true;
        inputHerbivoreSplitThreshold.disabled = true;
        inputPredatorSplitThreshold.disabled = true;
        inputMaxGenerations.disabled = true;
        btnStart.disabled = true;
        btnInstant.disabled = true;
        btnReset.disabled = false;

        simStatus.textContent = 'Running';
        simStatus.className = 'badge running';

        const h0 = Math.max(1, Math.round(parseFloat(inputInitialPop.value) || 150));
        const pred0 = Math.max(0, Math.round(parseFloat(inputInitialPred.value) || 8));
        
        currentGeneration = 0;
        spawnInitialPopulation(h0, pred0);

        const kEmergent = getEmergentK();
        initCharts(kEmergent, 0.15); // dummy r value
        runGenerationStep();
    }

    function runGenerationStep() {
        const maxGen = Math.max(10, parseInt(inputMaxGenerations.value) || 200);
        if (currentGeneration > maxGen || populationCount <= 0) {
            completeSimulation();
            return;
        }

        const foodSpawnRate = parseFloat(inputFoodSpawnRate.value) || 60;
        const seasonLength = parseFloat(inputSeasonLength.value) || 80;
        const survivalCost = parseFloat(inputSurvivalCost.value) || 5;
        const predatorCost = parseFloat(inputPredatorSurvivalCost.value) || 15;
        const kEmergent = getEmergentK();

        // Record state BEFORE the generation step
        const popBefore = populationCount;

        if (currentGeneration === 0) {
            // Generation 0: just record initial state, no births/deaths yet
            const hCount = individuals.filter(o => o.type === 'herbivore').length;
            const pCount = individuals.filter(o => o.type === 'predator').length;
            historyLabels.push(0);
            historyPopData.push(popBefore);
            historyHerbData.push(hCount);
            historyPredData.push(pCount);
            historyCapData.push(kEmergent);
            historyGrowthRateData.push(0);
            historyBirthRateData.push(0);
            historyDeathRateData.push(0);
            historyTotalBirthsData.push(0);
            historyTotalDeathsData.push(0);
        } else {
            // Simulate one generation — real stochastic events
            const result = simulateGeneration(foodSpawnRate, seasonLength, survivalCost, predatorCost);
            const netGrowth = result.births - result.deaths;

            const hCount = individuals.filter(o => o.type === 'herbivore').length;
            const pCount = individuals.filter(o => o.type === 'predator').length;

            // Per-capita rates from ACTUAL events
            const actualBirthRate = popBefore > 0 ? result.births / popBefore : 0;
            const actualDeathRate = popBefore > 0 ? result.deaths / popBefore : 0;

            historyLabels.push(currentGeneration);
            historyPopData.push(populationCount);
            historyHerbData.push(hCount);
            historyPredData.push(pCount);
            historyCapData.push(kEmergent);
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
        const capacityPct = Math.min(100, Math.round((populationCount / kEmergent) * 100));
        valUtil.textContent = `${capacityPct}%`;

        // Update Charts
        if (typeof Chart !== 'undefined') {
            if (populationChart) populationChart.update('none');
            if (ratesChart) ratesChart.update('none');
            if (totalRatesChart) totalRatesChart.update('none');
        } else {
            drawFallbackChart(kEmergent, 0.15);
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
        inputInitialPred.disabled = true;
        inputFoodSpawnRate.disabled = true;
        inputSeasonLength.disabled = true;
        inputSurvivalCost.disabled = true;
        inputPredatorSurvivalCost.disabled = true;
        inputHerbivoreSplitThreshold.disabled = true;
        inputPredatorSplitThreshold.disabled = true;
        inputMaxGenerations.disabled = true;
        btnStart.disabled = true;
        btnInstant.disabled = true;
        btnReset.disabled = false;

        const h0 = Math.max(1, Math.round(parseFloat(inputInitialPop.value) || 150));
        const pred0 = Math.max(0, Math.round(parseFloat(inputInitialPred.value) || 8));
        const foodSpawnRate = parseFloat(inputFoodSpawnRate.value) || 60;
        const seasonLength = parseFloat(inputSeasonLength.value) || 80;
        const survivalCost = parseFloat(inputSurvivalCost.value) || 5;
        const predatorCost = parseFloat(inputPredatorSurvivalCost.value) || 15;
        const kEmergent = getEmergentK();

        spawnInitialPopulation(h0, pred0);

        // Generation 0
        const h0_count = individuals.filter(o => o.type === 'herbivore').length;
        const pred0_count = individuals.filter(o => o.type === 'predator').length;
        historyLabels.push(0);
        historyPopData.push(populationCount);
        historyHerbData.push(h0_count);
        historyPredData.push(pred0_count);
        historyCapData.push(kEmergent);
        historyGrowthRateData.push(0);
        historyBirthRateData.push(0);
        historyDeathRateData.push(0);
        historyTotalBirthsData.push(0);
        historyTotalDeathsData.push(0);

        const maxGen = Math.max(10, parseInt(inputMaxGenerations.value) || 200);
        for (let t = 1; t <= maxGen; t++) {
            const popBefore = populationCount;
            const result = simulateGeneration(foodSpawnRate, seasonLength, survivalCost, predatorCost);
            const netGrowth = result.births - result.deaths;
            const actualBirthRate = popBefore > 0 ? result.births / popBefore : 0;
            const actualDeathRate = popBefore > 0 ? result.deaths / popBefore : 0;

            const hCount = individuals.filter(o => o.type === 'herbivore').length;
            const pCount = individuals.filter(o => o.type === 'predator').length;

            historyLabels.push(t);
            historyPopData.push(populationCount);
            historyHerbData.push(hCount);
            historyPredData.push(pCount);
            historyCapData.push(kEmergent);
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
        const capacityPct = Math.min(100, Math.round((historyPopData[lastIdx] / kEmergent) * 100));
        valUtil.textContent = `${capacityPct}%`;
        valBirths.textContent = historyTotalBirthsData[lastIdx].toLocaleString();
        valDeaths.textContent = historyTotalDeathsData[lastIdx].toLocaleString();

        initCharts(kEmergent, 0.15);
        if (typeof Chart !== 'undefined') {
            if (populationChart) populationChart.update();
            if (ratesChart) ratesChart.update();
            if (totalRatesChart) totalRatesChart.update();
        } else {
            drawFallbackChart(kEmergent, 0.15);
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
        historyHerbData = [];
        historyPredData = [];
        historyCapData = [];
        historyGrowthRateData = [];
        historyBirthRateData = [];
        historyDeathRateData = [];
        historyTotalBirthsData = [];
        historyTotalDeathsData = [];

        inputInitialPop.disabled = false;
        inputInitialPred.disabled = false;
        inputFoodSpawnRate.disabled = false;
        inputSeasonLength.disabled = false;
        inputSurvivalCost.disabled = false;
        inputPredatorSurvivalCost.disabled = false;
        inputHerbivoreSplitThreshold.disabled = false;
        inputPredatorSplitThreshold.disabled = false;
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
        foodItems = [];
        populationCount = 0;

        const kEmergent = getEmergentK();
        initCharts(kEmergent, 0.15);
    }

    // Attach Event Listeners
    btnStart.addEventListener('click', startSimulation);
    btnInstant.addEventListener('click', runInstant);
    btnReset.addEventListener('click', resetSimulation);

    // Initial default chart load
    resetSimulation();
});
