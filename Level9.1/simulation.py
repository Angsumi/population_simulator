import random
from config import Config
from entities.grass import Grass
from entities.deer import Deer
from entities.lion import Lion
from spatial_grid import SpatialGrid

class Simulation:
    def __init__(self):
        self.config = Config()
        self.biological_day = 0
        self.visual_day = 0
        self.tick_count = 0
        
        self.deer = []
        self.lions = []
        self.grass = []
        
        self.history = {
            "day": [],
            "deer": [],
            "lions": [],
            "grass": []
        }
        self.reset()
        
    def reset(self):
        self.biological_day = 0
        self.visual_day = 0
        self.tick_count = 0
        self.deer = [Deer(random.uniform(0, self.config.map_width), random.uniform(0, self.config.map_height)) for _ in range(self.config.init_deer)]
        self.lions = [Lion(random.uniform(0, self.config.map_width), random.uniform(0, self.config.map_height)) for _ in range(self.config.init_lions)]
        self.grass = [Grass(random.uniform(0, self.config.map_width), random.uniform(0, self.config.map_height)) for _ in range(500)]
        
        self.history = {
            "day": [],
            "deer": [],
            "lions": [],
            "grass": []
        }
        
    def step(self):
        grid = SpatialGrid(60)
        for g in self.grass: grid.add(g, 'grass')
        for d in self.deer: grid.add(d, 'deer')
        for l in self.lions: grid.add(l, 'lions')
        
        env_state = {'grid': grid, 'grass': self.grass, 'deer': self.deer, 'lions': self.lions}
        
        born_deer = []
        for d in self.deer:
            if not d.dead:
                d.update(env_state, self.config)
                d.eat(env_state, self.config)
                born_deer.extend(d.reproduce(self.config))
        self.deer.extend(born_deer)
        
        born_lions = []
        for l in self.lions:
            if not l.dead:
                l.update(env_state, self.config)
                l.eat(env_state, self.config)
                born_lions.extend(l.reproduce(self.config))
        self.lions.extend(born_lions)
        
        self.biological_day += 1
        self.visual_day += 1
        
        self.grass.extend(Grass.spawn_daily(self.config, len(self.grass)))
        
        for d in self.deer:
            if not d.dead: d.daily_update(self.config)
        
        for l in self.lions:
            if not l.dead: l.daily_update(self.config)
            
        self.grass = [g for g in self.grass if not getattr(g, 'eaten', False)]
        self.deer = [d for d in self.deer if not getattr(d, 'dead', False)]
        self.lions = [l for l in self.lions if not getattr(l, 'dead', False)]
                    
        self.history['day'].append(self.visual_day)
        self.history['deer'].append(len(self.deer))
        self.history['lions'].append(len(self.lions))
        self.history['grass'].append(len(self.grass))
