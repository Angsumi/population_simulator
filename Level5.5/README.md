# Three-Trophic Ecosystem Simulator (Level 5.5: Territorial Predators)

An individual-level (agent-based) simulation of a three-trophic level food chain (Producer, Herbivore, Predator) with active stabilization mechanisms to prevent premature extinction.

## Upgrades in Level 5.5

1. **Predator Territoriality (Crowding Stress)**:
   - Stabilizes Scenario 2 collapses (where predators overeat and drive prey to extinction).
   - In nature, predators are territorial. If there are too many predators in a single area, they fight for territory and experience stress.
   - If a predator has **more than 2 neighboring predators within a 120px radius**:
     - Its metabolic cost per generation is **doubled** (due to territorial fighting/aggression).
     - Its reproduction is **blocked** (crowding stress halts births).
   - This naturally caps predator densities locally, giving prey space to recover even during predator peaks.
2. **Prey Fleeing & Slower Predator Births**:
   - Preserves Level 5.4's herbivore fleeing behavior and lowered predator energy intake from eating ($30$ energy).
3. **Dynamic Caps & Bottom-Center Safe Zone**:
   - Preserves dynamic energy caps and bottom-center safe zone brush.
