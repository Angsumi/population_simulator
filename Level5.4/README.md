# Three-Trophic Ecosystem Simulator (Level 5.4: Prey Fleeing & Balanced Hunt)

An individual-level (agent-based) simulation of a three-trophic level food chain (Producer, Herbivore, Predator) with active stabilization mechanisms to prevent premature extinction.

## Upgrades in Level 5.4

1. **Prey Fleeing Behavior (Evaporative Hunting Pressure)**:
   - When a herbivore senses a predator within a `75px` radius, it generates a steering vector in the opposite direction (`vx`, `vy` steer away with `-0.85` scale).
   - This prevents predators from easily cornering herbivores and wiping them out, giving the ecosystem a dynamic spatial push-and-pull.
2. **Slower Predator Reproduction Rate**:
   - Lowered the nutritional energy gained by a predator from eating a herbivore from `85` to `30`.
   - This breaks the 1-to-1 kill-to-birth cycle, requiring predators to successfully hunt multiple herbivores (typically 2-3) to reproduce, which controls predator exponential growth.
3. **Dynamic Parameter Caps & Safe Zone Brush**:
   - Preserves dynamic energy caps, linked satiation checks, and the bottom-center safe zone brush.
