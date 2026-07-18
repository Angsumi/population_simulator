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
