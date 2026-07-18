# Agent-Based Population Simulator

A browser-based **individual-level (agent-based) simulation** of population dynamics. Unlike formula-driven simulators, every organism is an independent entity that breeds by splitting and dies stochastically. All graphs plot **real data from actual simulated events**, not derivatives of an equation.

---

## How It Works — Agent-Based Model

Each organism in the simulation is an independent agent. Every generation, each individual independently:

- **Has a chance to reproduce** (birth by splitting — child appears adjacent to parent)
- **Has a chance to die** (probability increases with crowding)

### Birth & Death Rate Decomposition

The per-capita probabilities use a **symmetric decomposition** of the logistic equation:

| Rate | Formula | At P = K |
|---|---|---|
| Birth | $b(P) = r \cdot \left(1 - \frac{P}{2K}\right)$ | $r/2$ |
| Death | $d(P) = r \cdot \frac{P}{2K}$ | $r/2$ |
| **Net** | $b - d = r \cdot \left(1 - \frac{P}{K}\right)$ | **0 → equilibrium** |

At carrying capacity ($P = K$), **organisms don't stop breeding** — births and deaths simply equalize, and total population stabilizes. This matches real biological systems.

### Stochastic Simulation

- **Small populations (≤ 500):** Exact per-individual coin flips (Bernoulli trials)
- **Large populations (> 500):** Binomial normal approximation for performance

This means each simulation run produces slightly different curves due to random variation — just like in nature.

---

## Features

1. **True Agent-Based Simulation**: Each organism is an independent entity with age, position, velocity, and stochastic birth/death — not a formula evaluation.
2. **Configurable Parameters**:
   - Initial Population ($P_0$), Growth Rate ($r$), Carrying Capacity ($K$)
   - **Generations to Run** — user-configurable (10–1000)
   - Simulation speed slider
3. **Habitat-Centered Layout**:
   - Large live habitat canvas as the **focal centerpiece**
   - Parameter controls on the left, live stats on the right
   - Three charts in a row below
4. **Visual Birth by Splitting**: New organisms spawn adjacent to their parent with a push animation, visually representing cell division / reproduction.
5. **Age-Based Color Transitions**:
   - 🟢 **Green** = Newborn
   - 🟡 **Yellow** = Maturing
   - 🔴 **Red** = Aging
6. **Three Real-Data Charts**:
   - **Population & Net Growth** — actual population count + real net growth per generation
   - **Per-Capita Birth & Death Rate** — computed from actual event counts (births/population, deaths/population)
   - **Total Births & Deaths** — raw counts from the simulation each generation
7. **Live Stats Panel**: Generation, population, capacity utilization, births this generation, deaths this generation
8. **Resilient Offline Fallback**: Custom canvas-based charts render if Chart.js fails to load.
9. **Responsive Design**: Adapts from desktop 3-column layout to single-column on mobile.

---

## Project Structure

```
├── index.html                     # HTML layout — habitat-centered dashboard
├── style.css                      # Dark glassmorphic theme with responsive grid
├── app.js                         # Agent-based simulation engine, charts, animation
├── README.md                      # This file
└── old_formula_simulation/        # Archived original formula-based simulation
    ├── app.js
    ├── index.html
    ├── style.css
    └── README.md
```

---

## How to Run

Open `index.html` in any modern browser. No server or installation required.

1. Set parameters (P₀, r, K, generations)
2. Click **Run Simulation** (animated step-by-step) or **Run Instantly** (all at once)
3. Watch organisms split and die in the habitat while charts update with real data

---

## Previous Version

The original formula-based simulation (logistic growth equation) is preserved in the [`old_formula_simulation/`](old_formula_simulation/) directory for reference.
