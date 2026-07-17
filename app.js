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
    let historyBirthRateData = [];
    let historyDeathRateData = [];
    let historyTotalBirthsData = [];
    let historyTotalDeathsData = [];

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

    // Initialize the Charts
    function initCharts(carryingCapacity, initialGrowthRate) {
        if (typeof Chart !== 'undefined') {
            // Main Population Chart
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
                            grid: { drawOnChartArea: false }, 
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

            // Per-Capita Rates Chart
            if (ratesChart) {
                ratesChart.destroy();
            }

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
                            suggestedMax: initialGrowthRate * 1.5,
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
                                text: 'Rate per Capita',
                                color: '#9ca3af',
                                font: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' }
                            }
                        }
                    }
                }
            });

            // Total Rates Chart
            if (totalRatesChart) {
                totalRatesChart.destroy();
            }

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
                            suggestedMax: carryingCapacity * initialGrowthRate * 1.2,
                            grid: { color: 'rgba(255, 255, 255, 0.04)' },
                            ticks: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans' } },
                            title: {
                                display: true,
                                text: 'Total Individuals / gen',
                                color: '#9ca3af',
                                font: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' }
                            }
                        }
                    }
                }
            });

        } else {
            // Fallback drawing when offline (no Chart.js)
            drawFallbackChart(carryingCapacity, initialGrowthRate);
        }
    }

    function drawFallbackChart(carryingCapacity, initialGrowthRate) {
        // Reset canvas dimensions to fit their parents
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

        // Pop Chart Grid lines
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

        // Pop Chart Carrying capacity line
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
                const x = padding + (i / maxGenerations) * graphW;
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
                const x = padding + (i / maxGenerations) * graphW;
                const y = padding + graphH - ((historyGrowthRateData[i] / maxGrowthVal) * graphH);
                if (i === 0) ctxPop.moveTo(x, y);
                else ctxPop.lineTo(x, y);
            }
            ctxPop.stroke();
        }

        // --- DRAW PER-CAPITA RATES CHART ---
        const ctxRate = ctxRatesChart;
        ctxRate.fillStyle = '#0b0c15';
        ctxRate.fillRect(0, 0, canvasRatesChart.width, canvasRatesChart.height);

        // Grid lines for rates chart
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

        // Birth Rate (Blue)
        if (historyBirthRateData.length > 0) {
            ctxRate.strokeStyle = '#3b82f6';
            ctxRate.lineWidth = 2.5;
            ctxRate.beginPath();
            for (let i = 0; i < historyBirthRateData.length; i++) {
                const x = padding + (i / maxGenerations) * graphW;
                const y = padding + graphH - ((historyBirthRateData[i] / maxRateVal) * graphH);
                if (i === 0) ctxRate.moveTo(x, y);
                else ctxRate.lineTo(x, y);
            }
            ctxRate.stroke();
        }

        // Death Rate (Orange)
        if (historyDeathRateData.length > 0) {
            ctxRate.strokeStyle = '#f97316';
            ctxRate.lineWidth = 2.5;
            ctxRate.beginPath();
            for (let i = 0; i < historyDeathRateData.length; i++) {
                const x = padding + (i / maxGenerations) * graphW;
                const y = padding + graphH - ((historyDeathRateData[i] / maxRateVal) * graphH);
                if (i === 0) ctxRate.moveTo(x, y);
                else ctxRate.lineTo(x, y);
            }
            ctxRate.stroke();
        }

        // --- DRAW TOTAL RATES CHART ---
        const ctxTotalRate = ctxTotalRatesChart;
        ctxTotalRate.fillStyle = '#0b0c15';
        ctxTotalRate.fillRect(0, 0, canvasTotalRatesChart.width, canvasTotalRatesChart.height);

        // Grid lines for total rates chart
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

        // Total Births (Light Blue)
        if (historyTotalBirthsData.length > 0) {
            ctxTotalRate.strokeStyle = '#60a5fa';
            ctxTotalRate.lineWidth = 2.5;
            ctxTotalRate.beginPath();
            for (let i = 0; i < historyTotalBirthsData.length; i++) {
                const x = padding + (i / maxGenerations) * graphW;
                const y = padding + graphH - ((historyTotalBirthsData[i] / maxTotalRateVal) * graphH);
                if (i === 0) ctxTotalRate.moveTo(x, y);
                else ctxTotalRate.lineTo(x, y);
            }
            ctxTotalRate.stroke();
        }

        // Total Deaths (Orange)
        if (historyTotalDeathsData.length > 0) {
            ctxTotalRate.strokeStyle = '#f97316';
            ctxTotalRate.lineWidth = 2.5;
            ctxTotalRate.beginPath();
            for (let i = 0; i < historyTotalDeathsData.length; i++) {
                const x = padding + (i / maxGenerations) * graphW;
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
        const r = parseFloat(inputGrowthRate.value) || 0.1;

        currentPopulation = p0;
        currentGeneration = 0;

        initCharts(k, r);
        runGenerationStep();
    }

    function runGenerationStep() {
        if (currentGeneration > maxGenerations) {
            completeSimulation();
            return;
        }

        const r = parseFloat(inputGrowthRate.value) || 0.1;
        const k = parseFloat(inputCarryingCapacity.value) || 500;

        // Birth and death rate calculation
        const perCapitaBirth = r;
        const perCapitaDeath = r * (currentPopulation / k);
        
        const totalBirths = perCapitaBirth * currentPopulation;
        const totalDeaths = perCapitaDeath * currentPopulation;
        const growthRateVal = totalBirths - totalDeaths;
        
        const nextPop = currentPopulation + growthRateVal;
        currentPopulation = Math.max(0, nextPop);

        // Save statistics
        historyLabels.push(currentGeneration);
        historyPopData.push(Math.round(currentPopulation));
        historyCapData.push(k);
        historyGrowthRateData.push(Math.round(growthRateVal * 100) / 100);
        historyBirthRateData.push(Math.round(perCapitaBirth * 1000) / 1000);
        historyDeathRateData.push(Math.round(perCapitaDeath * 1000) / 1000);
        historyTotalBirthsData.push(Math.round(totalBirths * 10) / 10);
        historyTotalDeathsData.push(Math.round(totalDeaths * 10) / 10);

        // Update UI Stats
        valTime.textContent = currentGeneration;
        valPopulation.textContent = Math.round(currentPopulation).toLocaleString();
        const capacityPct = Math.min(100, Math.round((currentPopulation / k) * 100));
        valUtil.textContent = `${capacityPct}%`;

        // Render Canvas Blobs
        updateOrganisms(currentPopulation);

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

            const perCapitaBirth = r;
            const perCapitaDeath = r * (currentPopulation / k);
            
            const totalBirths = perCapitaBirth * currentPopulation;
            const totalDeaths = perCapitaDeath * currentPopulation;
            const growthRateVal = totalBirths - totalDeaths;
            
            historyGrowthRateData.push(Math.round(growthRateVal * 100) / 100);
            historyBirthRateData.push(Math.round(perCapitaBirth * 1000) / 1000);
            historyDeathRateData.push(Math.round(perCapitaDeath * 1000) / 1000);
            historyTotalBirthsData.push(Math.round(totalBirths * 10) / 10);
            historyTotalDeathsData.push(Math.round(totalDeaths * 10) / 10);

            const nextPop = currentPopulation + growthRateVal;
            currentPopulation = Math.max(0, nextPop);
        }

        // End values update
        valTime.textContent = maxGenerations;
        valPopulation.textContent = Math.round(historyPopData[maxGenerations]).toLocaleString();
        const capacityPct = Math.min(100, Math.round((historyPopData[maxGenerations] / k) * 100));
        valUtil.textContent = `${capacityPct}%`;

        initCharts(k, r);
        updateOrganisms(historyPopData[maxGenerations]);
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
        historyBirthRateData = [];
        historyDeathRateData = [];
        historyTotalBirthsData = [];
        historyTotalDeathsData = [];

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
