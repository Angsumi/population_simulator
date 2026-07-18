# Three-Trophic Ecosystem Simulator (Level 5.3: Dynamic Energy Caps)

An individual-level (agent-based) simulation of a three-trophic level food chain (Producer, Herbivore, Predator) with active stabilization mechanisms to prevent premature extinction.

## Enhancements in Level 5.3

1. **Dynamic Energy Caps**:
   - Resolves the parameter ceiling where setting high split thresholds prevented organisms from reproducing (since maximum energy was capped at a hard value of `300`).
   - Maximum energy caps now scale dynamically based on custom user split thresholds:
     - Herbivore Energy Cap = `Herbivore Split Energy + Grass Nutritive Value * 2`
     - Predator Energy Cap = `Predator Split Energy + Predator Nutritive Value * 2`
2. **Linked Satiation Limits**:
   - Satiation limits (when agents stop foraging/hunting to conserve resources) are linked dynamically:
     - Herbivore Satiation = `Herbivore Split Energy * 0.9`
     - Predator Satiation = `Predator Split Energy * 0.85`
3. **Bottom-Center Camouflage Forest**:
   - Prey safe zone located at bottom-center ($35\%$ to $65\%$ width, bottom $40\%$ height) leaving the top of the canvas open for predator traversal.
