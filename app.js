document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const inputInitialPop = document.getElementById('initialPop');
    const inputGrowthRate = document.getElementById('growthRate');
    const inputCarryingCapacity = document.getElementById('carryingCapacity');
    const btnStart = document.getElementById('btnStart');
    const btnInstant = document.getElementById('btnInstant');
    const btnReset = document.getElementById('btnReset');
    const valTime = document.getElementById('valTime');
    const valPopulation = document.getElementById('valPopulation');
    const valUtil = document.getElementById('valUtil');
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

    // Chart Setup
    const canvasChart = document.getElementById('populationChart');
    if (!canvasChart) {
        console.error("Canvas element 'populationChart' not found!");
        return;
    }
    const ctxChart = canvasChart.getContext('2d');
    let populationChart = null;

    // Setup Canvas size
    function resizeCanvas() {
        if (canvas && canvas.parentElement) {
            const parentWidth = canvas.parentElement.clientWidth;
            canvas.width = Math.max(100, parentWidth - 40);
            canvas.height = 150;
        }
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Simulation State
    let simInterval = null;
    let currentGeneration = 0;
    const maxGenerations = 100;
    let currentPopulation = 0;
    let historyLabels = [];
    let historyPopData = [];
    let historyCapData = [];
    let historyGrowthRateData = [];

    // Particle logic for Visual Habitat
    class Organism {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 1.5;
            this.vy = (Math.random() - 0.5) * 1.5;
            this.radius = Math.random() * 2 + 2;
            this.alpha = 0; // fade-in
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Bouncing logic
            if (this.x < this.radius || this.x > canvas.width - this.radius) {
                this.vx *= -1;
                this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
            }
            if (this.y < this.radius || this.y > canvas.height - this.radius) {
                this.vy *= -1;
                this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
            }

            if (this.alpha < 1) {
                this.alpha += 0.1;
            }
        }

        draw() {
            ctxCanvas.beginPath();
            ctxCanvas.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctxCanvas.fillStyle = `rgba(99, 102, 241, ${this.alpha})`;
            ctxCanvas.shadowBlur = 4;
            ctxCanvas.shadowColor = 'rgba(99, 102, 241, 0.8)';
            ctxCanvas.fill();
            ctxCanvas.shadowBlur = 0; // reset
        }
    }

    let organisms = [];

    // Handle particle count adjustments based on population
    function updateOrganisms(targetCount) {
        const visualTarget = Math.min(Math.round(targetCount), 350);

        if (organisms.length < visualTarget) {
            const toAdd = visualTarget - organisms.length;
            for (let i = 0; i < toAdd; i++) {
                organisms.push(new Organism(
                    Math.random() * (canvas.width - 20) + 10,
                    Math.random() * (canvas.height - 20) + 10
                ));
            }
        } else if (organisms.length > visualTarget) {
            organisms.splice(visualTarget);
        }
    }

    // Particle animation loop
    function animate() {
        ctxCanvas.fillStyle = '#0b0c15';
        ctxCanvas.fillRect(0, 0, canvas.width, canvas.height);

        // Draw habitat boundaries/capacity lines
        ctxCanvas.strokeStyle = 'rgba(236, 72, 153, 0.15)';
        ctxCanvas.lineWidth = 1.5;
        ctxCanvas.setLineDash([5, 5]);
        ctxCanvas.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
        ctxCanvas.setLineDash([]);

        organisms.forEach(org => {
            org.update();
            org.draw();
        });

        requestAnimationFrame(animate);
    }
    animate();

    // Initialize the Chart
    function initChart(carryingCapacity) {
        if (typeof Chart !== 'undefined') {
            if (populationChart) {
                populationChart.destroy();
            }

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
                            label: 'Growth Rate (ΔP)',
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
                            grid: { drawOnChartArea: false }, // avoid grid line overlaps
                            ticks: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans' } },
                            title: {
                                display: true,
                                text: 'Growth Rate (ΔP / step)',
                                color: '#10b981',
                                font: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' }
                            }
                        }
                    }
                }
            });
        } else {
            // Fallback drawing when offline (no Chart.js)
            drawFallbackChart(carryingCapacity);
        }
    }

    function drawFallbackChart(carryingCapacity) {
        // Set internal resolution match parent box size
        canvasChart.width = canvasChart.parentElement.clientWidth;
        canvasChart.height = Math.max(280, canvasChart.parentElement.clientHeight || 280);

        const w = canvasChart.width;
        const h = canvasChart.height;

        const ctx = ctxChart;

        // Background
        ctx.fillStyle = '#0b0c15';
        ctx.fillRect(0, 0, w, h);

        // Labels & Warning
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.font = '12px Outfit, sans-serif';
        ctx.fillText('Offline Mode (Chart.js failed to load)', 20, 25);

        // Set graph area bounds
        const padding = 40;
        const graphW = w - padding * 2;
        const graphH = h - padding * 2;

        // Draw Grid Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (graphH * i / 4);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(w - padding, y);
            ctx.stroke();
        }

        // Determine max values
        const maxVal = Math.max(carryingCapacity * 1.2, ...historyPopData, 100);
        const maxGrowthVal = Math.max(...historyGrowthRateData, 5);

        // Draw Carrying Capacity line (Pink)
        const capY = padding + graphH - ((carryingCapacity / maxVal) * graphH);
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, capY);
        ctx.lineTo(w - padding, capY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ec4899';
        ctx.fillText(`Capacity K (${carryingCapacity})`, w - padding - 120, capY - 5);

        // Draw Population Line (Indigo)
        if (historyPopData.length > 0) {
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 3;
            ctx.beginPath();
            
            for (let i = 0; i < historyPopData.length; i++) {
                const x = padding + (i / maxGenerations) * graphW;
                const y = padding + graphH - ((historyPopData[i] / maxVal) * graphH);
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }

        // Draw Growth Rate Line (Green)
        if (historyGrowthRateData.length > 0) {
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            for (let i = 0; i < historyGrowthRateData.length; i++) {
                const x = padding + (i / maxGenerations) * graphW;
                const y = padding + graphH - ((historyGrowthRateData[i] / maxGrowthVal) * graphH);
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }
    }

    // Speed slider listener
    speedSlider.addEventListener('input', () => {
        speedVal.textContent = `${speedSlider.value}ms / generation`;
    });

    // Run Step-by-Step Simulation
    function startSimulation() {
        resetSimulation();

        // Lock Inputs
        inputInitialPop.disabled = true;
        inputGrowthRate.disabled = true;
        inputCarryingCapacity.disabled = true;
        btnStart.disabled = true;
        btnInstant.disabled = true;
        btnReset.disabled = false;

        simStatus.textContent = 'Running';
        simStatus.className = 'badge running';

        const p0 = parseFloat(inputInitialPop.value) || 10;
        const k = parseFloat(inputCarryingCapacity.value) || 500;

        currentPopulation = p0;
        currentGeneration = 0;

        initChart(k);
        runGenerationStep();
    }

    function runGenerationStep() {
        if (currentGeneration > maxGenerations) {
            completeSimulation();
            return;
        }

        const r = parseFloat(inputGrowthRate.value) || 0.1;
        const k = parseFloat(inputCarryingCapacity.value) || 500;

        // Calculate growth rate ΔP = r * P * (1 - P/K)
        const growthRateVal = r * currentPopulation * (1 - (currentPopulation / k));
        const nextPop = currentPopulation + growthRateVal;
        currentPopulation = Math.max(0, nextPop);

        // Save statistics
        historyLabels.push(currentGeneration);
        historyPopData.push(Math.round(currentPopulation));
        historyCapData.push(k);
        historyGrowthRateData.push(Math.round(growthRateVal * 100) / 100);

        // Update UI Stats
        valTime.textContent = currentGeneration;
        valPopulation.textContent = Math.round(currentPopulation).toLocaleString();
        const capacityPct = Math.min(100, Math.round((currentPopulation / k) * 100));
        valUtil.textContent = `${capacityPct}%`;

        // Render Canvas Blobs
        updateOrganisms(currentPopulation);

        // Update Chart
        if (typeof Chart !== 'undefined' && populationChart) {
            populationChart.update('none');
        } else {
            drawFallbackChart(k);
        }

        currentGeneration++;
        const intervalSpeed = parseInt(speedSlider.value);
        simInterval = setTimeout(runGenerationStep, intervalSpeed);
    }

    // Run Simulation Instantly
    function runInstant() {
        resetSimulation();

        inputInitialPop.disabled = true;
        inputGrowthRate.disabled = true;
        inputCarryingCapacity.disabled = true;
        btnStart.disabled = true;
        btnInstant.disabled = true;
        btnReset.disabled = false;

        const p0 = parseFloat(inputInitialPop.value) || 10;
        const r = parseFloat(inputGrowthRate.value) || 0.1;
        const k = parseFloat(inputCarryingCapacity.value) || 500;

        currentPopulation = p0;
        
        for (let t = 0; t <= maxGenerations; t++) {
            historyLabels.push(t);
            historyPopData.push(Math.round(currentPopulation));
            historyCapData.push(k);

            const growthRateVal = r * currentPopulation * (1 - (currentPopulation / k));
            historyGrowthRateData.push(Math.round(growthRateVal * 100) / 100);

            const nextPop = currentPopulation + growthRateVal;
            currentPopulation = Math.max(0, nextPop);
        }

        // End values update
        valTime.textContent = maxGenerations;
        valPopulation.textContent = Math.round(historyPopData[maxGenerations]).toLocaleString();
        const capacityPct = Math.min(100, Math.round((historyPopData[maxGenerations] / k) * 100));
        valUtil.textContent = `${capacityPct}%`;

        initChart(k);
        updateOrganisms(historyPopData[maxGenerations]);
        if (typeof Chart !== 'undefined' && populationChart) {
            populationChart.update();
        } else {
            drawFallbackChart(k);
        }
        completeSimulation();
    }

    function completeSimulation() {
        clearTimeout(simInterval);
        simStatus.textContent = 'Stabilized';
        simStatus.className = 'badge completed';
        btnStart.disabled = true;
        btnInstant.disabled = true;
    }

    function resetSimulation() {
        clearTimeout(simInterval);

        historyLabels = [];
        historyPopData = [];
        historyCapData = [];
        historyGrowthRateData = [];

        inputInitialPop.disabled = false;
        inputGrowthRate.disabled = false;
        inputCarryingCapacity.disabled = false;
        btnStart.disabled = false;
        btnInstant.disabled = false;
        btnReset.disabled = true;

        valTime.textContent = '0';
        valPopulation.textContent = '0';
        valUtil.textContent = '0%';

        simStatus.textContent = 'Idle';
        simStatus.className = 'badge';

        organisms = [];
        
        const k = parseFloat(inputCarryingCapacity.value) || 500;
        initChart(k);
    }

    // Attach Event Listeners
    btnStart.addEventListener('click', startSimulation);
    btnInstant.addEventListener('click', runInstant);
    btnReset.addEventListener('click', resetSimulation);

    // Initial default chart load
    resetSimulation();
});
