# Three-Trophic Ecosystem Simulator (Level 5.2: Balanced Trophic Dynamics)

An individual-level (agent-based) simulation of a three-trophic level food chain (Producer, Herbivore, Predator) with active stabilization mechanisms to prevent premature extinction.

## Stabilization Upgrades in Level 5.2

1. **Herbivore Satiation Limits**:
   - Herbivores now experience satiation. When a herbivore's energy exceeds `125`, it **stops foraging** (no active steering towards grass) and **stops eating grass**.
   - This prevents herbivores from voraciously stripping the environment of grass, preserving food resources and preventing self-starvation crashes that kill the predators.
2. **Bottom-Center Camouflage Brush Zone**:
   - The refuge zone has been shifted to the bottom-center region of the canvas ($35\%$ to $65\%$ width, and bottom $40\%$ height).
   - This keeps prey safe inside the brush while **leaving the top 60% of the screen completely open**, allowing predators to cross freely from one side of the screen to the other without obstruction.
3. **Predator Satiation Cooldown**:
   - Predators with energy $> 140$ stop active hunting pursuit and wander randomly, letting prey populations recover.
