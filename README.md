# Logistic Population Growth Simulator

This repository contains multiple versions of a population simulator, demonstrating different levels of simulation complexity (from formula-based to fully agent-based) and user interactivity.

## Directory Structure & Update Protocol

The project is structured into four levels:

*   **[Level1](file:///home/angsuman/extra_spac/population_simulator/Level1/)** ([Live Demo](https://angsumi.github.io/population_simulator/Level1/)): The base version utilizing a standard formula-driven logistic growth simulation, paired with a visual habitat canvas.
*   **[Level1.1](file:///home/angsuman/extra_spac/population_simulator/Level1.1/)** ([Live Demo](https://angsumi.github.io/population_simulator/Level1.1/)): The formula-driven simulator (Level 1) updated to support interactive cursor kills. Clicking organisms on the habitat canvas kills them, decrements the population, and draws a visual death animation.
*   **[Level2](file:///home/angsuman/extra_spac/population_simulator/Level2/)** ([Live Demo](https://angsumi.github.io/population_simulator/Level2/)): An agent-based stochastic simulation. Individuals are autonomous agents with independent updates. Performs exact per-capita stochastic calculations for small populations ($P \le 500$) and binomial approximations for larger populations.
*   **[Level2.1](file:///home/angsuman/extra_spac/population_simulator/Level2.1/)** ([Live Demo](https://angsumi.github.io/population_simulator/Level2.1/)): The agent-based simulator (Level 2) updated to support interactive cursor kills with dynamic coordinate scaling and a visual death feedback animation.
*   **[Level3](file:///home/angsuman/extra_spac/population_simulator/Level3/)** ([Live Demo](https://angsumi.github.io/population_simulator/Level3/)): An emergent carrying capacity model utilizing spatial competition. Individual death probability increases locally based on the number of neighbors within their sensory radius ($R$), yielding an emergent carrying capacity $K$ without a global variable.
*   **[Level3.1](file:///home/angsuman/extra_spac/population_simulator/Level3.1/)** ([Live Demo](https://angsumi.github.io/population_simulator/Level3.1/)): An emergent carrying capacity model based on resource dynamics. Organisms wander, consume green food dots to gain energy, burn energy to survive, and split when fed. Carrying capacity emerges naturally from food regeneration rates and starvation.
*   **[Level3.1.1](file:///home/angsuman/extra_spac/population_simulator/Level3.1.1/)** ([Live Demo](https://angsumi.github.io/population_simulator/Level3.1.1/)): The upgraded resource dynamics model resolving starvation issues by introducing substep micro-movements/feeding iterations and faster wandering kinetics.
*   **[Level4](file:///home/angsuman/extra_spac/population_simulator/Level4/)** ([Live Demo](https://angsumi.github.io/population_simulator/Level4/)): The seasonal foraging simulation. Incorporates seasonal resource fluctuations (sine-modulated birth rates of grass), local seed dispersal (logistic growth of food), and smart foraging steering (organisms steer towards the nearest food dot within their sensory range).
*   **[Level5](file:///home/angsuman/extra_spac/population_simulator/Level5/)** ([Live Demo](https://angsumi.github.io/population_simulator/Level5/)): A 3-trophic level ecosystem model (Producer = Green, Herbivore = Blue, Predator = Red) with seasonal variations. Herbivores hunt grass, and Predators chase and devour Herbivores, all reproducing asexually.
*   **[Level5.1](file:///home/angsuman/extra_spac/population_simulator/Level5.1/)** ([Live Demo](https://angsumi.github.io/population_simulator/Level5.1/)): The stabilized 3-trophic ecosystem model. Prevents predator-prey collapses by introducing a central Camouflage Forest refuge for prey and a predator satiation cooldown.
*   **[Level5.2](file:///home/angsuman/extra_spac/population_simulator/Level5.2/)** ([Live Demo](https://angsumi.github.io/population_simulator/Level5.2/)): The balanced 3-trophic model. Perfects food preservation by adding herbivore satiation limit ($E > 125$) and moving the safe zone brush to the bottom-center, leaving predator crossing paths unobstructed.
*   **[Level5.3](file:///home/angsuman/extra_spac/population_simulator/Level5.3/)** ([Live Demo](https://angsumi.github.io/population_simulator/Level5.3/)): The dynamic energy cap model. Ties maximum energy limits and satiation limits dynamically to the user's custom birth split thresholds, resolving parameter bottlenecks.
*   **[Level5.4](file:///home/angsuman/extra_spac/population_simulator/Level5.4/)** ([Live Demo](https://angsumi.github.io/population_simulator/Level5.4/)): The spatial hunt equilibrium model. Resolves persistent prey extinctions by introducing active herbivore fleeing vectors ($75\text{px}$ sensory radius) and lowering predator food intake gains to stabilize population cycles.
*   **[Level6](file:///home/angsuman/extra_spac/population_simulator/Level6/)** ([Live Demo](https://angsumi.github.io/population_simulator/Level6/)): The Savanna Ecosystem Simulation. Models a complete natural landscape with grass, deer, and lions utilizing sexual reproduction (mating, maturity, gestation Litters), waterholes (hydration checks), seasonal cycle variation (wet vs. dry), and dry season wildfires.
*   **[Level7.1](file:///home/angsuman/extra_spac/population_simulator/Level7.1/)**: The bare Python Ecosystem Simulator. Generates headless simulation data over 200 days and outputs to a CSV and a custom pixel-rendered PNG, utilizing organic Lotka-Volterra dynamics. Unoptimized $O(N^2)$ interactions take ~10 minutes to execute.
*   **[Level7.1.1](file:///home/angsuman/extra_spac/population_simulator/Level7.1.1/)**: The PyPy-optimized version. Runs the exact same $O(N^2)$ internal code using the Just-In-Time PyPy compiler, reducing the runtime to ~3.5 minutes without altering a single line of logic.
*   **[Level7.1.2](file:///home/angsuman/extra_spac/population_simulator/Level7.1.2/)**: The algorithmic spatial optimization. Introduces a Spatial Partitioning Grid to drop calculation complexity from $O(N^2)$ to $O(N)$. This completes in ~1.5 minutes on standard Python, and an incredible ~41 seconds on PyPy, while maintaining absolutely identical ecological dynamics.
*   **[Level7.1.3](file:///home/angsuman/extra_spac/population_simulator/Level7.1.3/)**: The decoupled visualizer optimization. Launches a lightweight background HTTP thread to serialize the grid state and pushes it to a live HTML5 Canvas frontend. Fully decouples real-time rendering from the mathematical computation loop so the biological rules run untouched at maximum hardware speed.
*   **[Level7.1.4](file:///home/angsuman/extra_spac/population_simulator/Level7.1.4/)**: The real-time analytics visualizer. Extends the decoupled HTML frontend to render a live line graph tracking the Lotka-Volterra population curves dynamically as the simulation progresses.
*   **[Level7.1.5](file:///home/angsuman/extra_spac/population_simulator/Level7.1.5/)**: The visual chronology update. Maps 1 tick strictly to 1 Day (30 days = 1 month), scaling the visual real-time graph independently without altering underlying biological execution bounds.
*   **[Level8](file:///home/angsuman/extra_spac/population_simulator/Level8/)**: Phase 1 of Incremental Realism: Logistic Resource Dynamics. Modifies grass to multiply at an organic 5% compounding rate scaled to max carrying capacity rather than flat daily spawning.
*   **[Level8.1](file:///home/angsuman/extra_spac/population_simulator/Level8.1/)**: Phase 2 of Incremental Realism: Probabilistic Hunting & Vulnerable Forests. Introduces a 70% kill success probability for lions upon pouncing, and reduces hiding spot invulnerability to an 80% vision impairment penalty for searching lions.
*   **[Level8.2](file:///home/angsuman/extra_spac/population_simulator/Level8.2/)**: Phase 3 of Incremental Realism: Gestation Delay. Eliminates instantaneous threshold spawning. Satiated animals now enter an independent 20% daily probability to reproduce, smoothing the Lotka-Volterra birth curves.
*   **[Level8.3](file:///home/angsuman/extra_spac/population_simulator/Level8.3/)**: Phase 4 of Incremental Realism: Probabilistic Age Decay. Eliminates hard generation wipe-outs at `max_age`. Aged animals face an escalating 2% compounding daily chance of mortality, organically smoothing the decay parameter ($\gamma y$) on the graph.


---

## Cursor Kill Protocol

When implementing interactive elements (such as clicking to kill) in this repository:
1.  **Canvas Coordinate Scaling**: Map the client mouse coordinates to the internal canvas dimensions:
    ```javascript
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    ```
2.  **Stochastic Integration**: Direct cursor interactions must instantly update the live state count variable (`currentPopulation` / `populationCount`) to keep charts and analytics in sync.
3.  **Visual Feedback**: Render an expanding ring effect at the interaction coordinates to notify the user of the successful event.
