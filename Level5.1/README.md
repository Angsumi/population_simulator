# Three-Trophic Ecosystem Simulator (Level 5.1: Stabilized Food Chain)

An individual-level (agent-based) simulation of a three-trophic level food chain (Producer, Herbivore, Predator) with active stabilization mechanisms to prevent premature extinction.

## Stabilization Mechanisms

1. **Camouflage Forest (Prey Safe Zone)**:
   - Renders as a green tinted region in the center of the canvas ($35\%$ to $65\%$ canvas width).
   - Prey inside this zone are camouflaged by the tall grass and **cannot be spotted/tracked by predators**.
   - If a predator bumps into prey inside the forest by chance, it can still consume them, but active pursuit is disabled.
2. **Predator Satiation Cooldown**:
   - Predators that are fully fed (energy $> 140$) enter a satiated state.
   - Satiated predators **disable active hunting steering** and simply wander at random.
   - This prevents predators from over-hunting and wipe out the prey during times of abundance.
