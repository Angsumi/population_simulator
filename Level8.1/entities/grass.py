import random

class Grass:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.radius = 2
        self.eaten = False

    @staticmethod
    def spawn_daily(config, current_count):
        growth_amount = int(current_count * 0.05)
        if current_count + growth_amount > config.max_grass:
            growth_amount = max(0, config.max_grass - current_count)
            
        new_grass = []
        for _ in range(growth_amount):
            new_grass.append(Grass(random.uniform(0, config.map_width), random.uniform(0, config.map_height)))
        return new_grass

    def to_dict(self):
        return {"x": round(self.x, 1), "y": round(self.y, 1)}
