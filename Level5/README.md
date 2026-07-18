# Three-Trophic Ecosystem Simulator (Level 5)

An individual-level (agent-based) simulation of a three-trophic level food chain (Producer, Herbivore, Predator). All interactions are entirely bottom-up and spatial.

## Trophic Levels & Rules

1. **Producers (Grass)**:
   - Colored **Green** (`#10b981`).
   - Regenerates seasonally (sine wave modulation of spawn rate).
   - Grows logistically (seed dispersal model where new grass is more likely to sprout near existing grass).
2. **Herbivores**:
   - Colored **Blue** (`#3b82f6`).
   - Wanders the screen, steer towards nearby grass dots using chemotaxis sensing.
   - Consumes grass on contact to gain energy, burns energy every generation to survive.
   - Reproduces asexually by splitting when energy thresholds are met. Dies of starvation if energy drops to 0.
3. **Predators**:
   - Colored **Red** (`#ef4444`).
   - Steers directly towards the nearest Herbivore (chasing mechanics).
   - Consumes Herbivores on contact to gain substantial energy.
   - Burns energy at a higher metabolic rate than herbivores.
   - Reproduces asexually by splitting when energy is high. Dies of starvation if energy drops to 0.
