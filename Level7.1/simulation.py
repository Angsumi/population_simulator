import random
from config import Config
from entities.grass import Grass
from entities.deer import Deer
from entities.lion import Lion

class Simulation:
    def __init__(self):
        self.config = Config()
        self.day = 0
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
        self.day = 0
        self.tick_count = 0
        self.deer = [Deer(random.uniform(0, self.config.map_width), random.uniform(0, self.config.map_height)) for _ in range(self.config.init_deer)]
        self.lions = [Lion(random.uniform(0, self.config.map_width), random.uniform(0, self.config.map_height)) for _ in range(self.config.init_lions)]
        self.grass = [Grass(random.uniform(0, self.config.map_width), random.uniform(0, self.config.map_height)) for _ in range(int(self.config.init_deer * 1.5))]
        
        self.history = {
            "day": [],
            "deer": [],
            "lions": [],
            "grass": []
        }
        
    def step(self):
        # 1. Update Entities
        env_state = {'deer': self.deer, 'lions': self.lions, 'grass': self.grass}
        
        born_deer = []
        born_lions = []
        
        # Update Deer
        for d in self.deer:
            d.update(env_state, self.config)
            born_deer.extend(d.eat_and_reproduce(self.grass, self.config))
                        
        # Update Lions
        for l in self.lions:
            l.update(env_state, self.config)
            born_lions.extend(l.eat_and_reproduce(self.deer, self.config))

        self.deer.extend(born_deer)
        self.lions.extend(born_lions)
        
        # Daily updates
        self.tick_count += 1
        if self.tick_count >= self.config.tick_rate:
            self.tick_count = 0
            self.day += 1
            
            # Simple logic for grass: every day exactly 100 grass get generated
            self.grass.extend(Grass.spawn_daily(self.config))
                        
            # Starvation and Old Age checks for deer
            for i in range(len(self.deer) - 1, -1, -1):
                d = self.deer[i]
                d.daily_update(self.config)
                if d.dead:
                    self.deer.pop(i)
            
            # Starvation and Old Age checks for lions            
            for i in range(len(self.lions) - 1, -1, -1):
                l = self.lions[i]
                l.daily_update(self.config)
                if l.dead:
                    self.lions.pop(i)
                    
            # History
            self.history['day'].append(self.day)
            self.history['deer'].append(len(self.deer))
            self.history['lions'].append(len(self.lions))
            self.history['grass'].append(len(self.grass))
