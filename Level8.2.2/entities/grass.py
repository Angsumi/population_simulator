import random

class Grass:
    """
    Represents a patch of grass in the simulation.
    Grass is the primary food source for deer.
    """
    def __init__(self, x, y):
        """
        Initializes a new Grass object.
        :param x: The x-coordinate of the grass on the map.
        :param y: The y-coordinate of the grass on the map.
        """
        self.x = x
        self.y = y
        self.radius = 2  # The visual/interaction radius of the grass
        self.eaten = False  # Status flag indicating if the grass has been consumed

    @staticmethod
    def spawn_daily(config, current_count):
        """
        Calculates and spawns new grass daily based on current population.
        :param config: The configuration object containing simulation parameters.
        :param current_count: The current total number of grass patches.
        :return: A list of newly spawned Grass objects.
        """
        # Grass grows by 5% of its current population daily
        growth_amount = int(current_count * 0.05)
        
        # Ensure grass population doesn't exceed the maximum limit defined in config
        if current_count + growth_amount > config.max_grass:
            growth_amount = max(0, config.max_grass - current_count)
            
        new_grass = []
        # Spawn the calculated amount of new grass at random positions on the map
        for _ in range(growth_amount):
            new_grass.append(Grass(random.uniform(0, config.map_width), random.uniform(0, config.map_height)))
        return new_grass

    def to_dict(self):
        """
        Serializes the grass position for rendering/export.
        :return: A dictionary containing rounded x and y coordinates.
        """
        return {"x": round(self.x, 1), "y": round(self.y, 1)}
