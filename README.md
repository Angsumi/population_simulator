# Logistic Population Growth Simulator

A browser-based interactive simulation of population growth exhibiting logistic growth dynamics and stabilization at carrying capacity ($K$), designed in the style of the educational YouTube channel *Primer*.

## Mathematical Model
The simulator models discrete-time population growth using the classic **Logistic Growth Equation**:

$$P_{t+1} = P_t + r \cdot P_t \cdot \left(1 - \frac{P_t}{K}\right)$$

Where:
* **$P_t$**: Population size at generation $t$.
* **$r$**: Growth rate coefficient (birth rate minus death rate).
* **$K$**: Carrying capacity (the maximum population size the environment can support).
* **$\Delta P = r \cdot P_t \cdot (1 - P_t/K)$**: The Growth Rate (number of individuals added per generation).

---

## Features
1. **Interactive Parameters Panel**: Adjustable controls for Initial Population ($P_0$), Growth Rate ($r$), Carrying Capacity ($K$), and simulation step speed (ms per generation).
2. **Dual-Curve Visualization (Chart.js)**:
   * **Population Curve (Indigo)**: Shows the S-shaped sigmoid curve as the population grows exponentially and slows down towards carrying capacity.
   * **Growth Rate Curve (Green)**: Visualizes the bell-shaped growth rate ($\Delta P$), peaking exactly at $K/2$ (half-saturation point) and returning to zero as resources deplete.
   * **Carrying Capacity Line (Pink)**: Dotted line showing the physical limit ($K$) of the habitat.
3. **Habitat Particle Visualizer**: A live 2D canvas drawing individual "organisms" moving and bouncing inside their environment. New organisms spawn, fade, and group together dynamically as numbers grow.
4. **Resilient Offline Fallback**: If Chart.js CDN fails to load or there is no internet, the application automatically switches to drawing a custom canvas-based line chart natively.

---

## Project Structure
* [index.html](file:///home/angsuman/extra_spac/population_simulator/index.html) — HTML markup containing control panels, canvas container elements, and UI statistics.
* [style.css](file:///home/angsuman/extra_spac/population_simulator/style.css) — Custom modern dark theme styles with glassmorphic elements and styling details.
* [app.js](file:///home/angsuman/extra_spac/population_simulator/app.js) — The logic containing particle engines, growth models, DOM bindings, and graph updates.

---

## How to Run
Simply open the [index.html](file:///home/angsuman/extra_spac/population_simulator/index.html) file in any modern web browser to execute the simulator locally. No installation or server required.
