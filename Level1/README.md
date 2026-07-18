# Logistic Population Growth Simulator

A browser-based interactive simulation of population growth exhibiting logistic growth dynamics and stabilization at carrying capacity ($K$), designed in the style of the educational YouTube channel *Primer*.

---

## Mathematical Model & Biological Logic

The simulator models population growth using the classic **Logistic Growth Equation** derived from density-dependent birth and death dynamics:

$$\Delta P = \text{Births} - \text{Deaths}$$

In this model, the biological processes are split into per-capita components:
*   **Constant Per-Capita Birth Rate ($b = r$):** Individuals reproduce at a constant rate regardless of population density. 
*   **Density-Dependent Per-Capita Death Rate ($d = r \cdot \frac{P}{K}$):** The chance of dying increases linearly as resources run out and space becomes crowded.

By substituting these rates, the total population change per step simplifies to:

$$\Delta P = (r \cdot P) - \left(r \cdot \frac{P^2}{K}\right) = r \cdot P \cdot \left(1 - \frac{P}{K}\right)$$

At carrying capacity ($P = K$), the per-capita death rate ($d$) rises to equal the birth rate ($b$), causing population growth to stop. Births and deaths still occur continuously, but they balance out perfectly.

---

## Features

1. **Interactive Parameters Panel**: Real-time inputs for Initial Population ($P_0$), Growth Rate ($r$), Carrying Capacity ($K$), and simulation step speed.
2. **Three-Tier Visualization Dashboard**:
   *   **Main Population Graph (S-Curve & Bell-Curve)**: Shows the total population ($P$) sigmoidal curve along with the net growth rate ($\Delta P$), peaking exactly at $K/2$ before stabilizing.
   *   **Per-Capita Rates Graph (Intersection of Rates)**: Tracks the chance of reproduction ($b$) and death ($d$). Stabilization occurs exactly where the rising orange death rate line intersects the horizontal blue birth rate line.
   *   **Total Rates Graph (Cumulative Population Change)**: Tracks the cumulative births ($B$) and deaths ($D$) per generation, showing them converge to the same equilibrium ceiling ($r \cdot K$).
3. **Habitat Visualizer with Age Transitions**:
   *   A live 2D canvas displaying the population inside a bounded area.
   *   **Newly born organisms are colored Green** (`rgb(16, 185, 129)`).
   *   Over time, they **gradually transition into Red** (`rgb(239, 68, 68)`) as they age, providing a clear visual indication of birth timing, growth, and demographic age distribution.
4. **Resilient Offline Fallback**: If Chart.js fails to load (e.g. if offline), the simulator automatically draws custom canvas-based line charts for all three graphs.

---

## Project Structure
* [index.html](file:///home/angsuman/extra_spac/population_simulator/index.html) — HTML markup containing control panels, canvas container elements, and UI statistics.
* [style.css](file:///home/angsuman/extra_spac/population_simulator/style.css) — Custom modern dark theme styles with glassmorphic elements and styling details.
* [app.js](file:///home/angsuman/extra_spac/population_simulator/app.js) — The logic containing particle engines, growth models, DOM bindings, and graph updates.
* [README.md](file:///home/angsuman/extra_spac/population_simulator/README.md) — Documentation detailing model logic, equations, and code architecture.

---

## How to Run
Simply open the [index.html](file:///home/angsuman/extra_spac/population_simulator/index.html) file in any modern web browser to execute the simulator locally. No installation or server required.
