import time
import threading
import random
from config import Config, distance, in_hiding_spot
from entities.grass import Grass
from entities.deer import Deer
from entities.lion import Lion

class Simulation:
    def __init__(self):
        self.config = Config()
        self.running = False
        self.day = 0
        self.season = 'Constant'
        self.tick_count = 0
        
        self.deer = []
        self.lions = []
        self.grass = []
        self.death_effects = []
        
        self.history = {
            "labels": [],
            "deer": [],
            "lions": [],
            "grass": []
        }
        
        self.lock = threading.Lock()
        self.reset()
        
    def reset(self):
        with self.lock:
            self.day = 0
            self.season = 'Constant'
            self.tick_count = 0
            self.deer = [Deer(random.uniform(0, self.config.map_width), random.uniform(0, self.config.map_height)) for _ in range(self.config.init_deer)]
            self.lions = [Lion(random.uniform(0, self.config.map_width), random.uniform(0, self.config.map_height)) for _ in range(self.config.init_lions)]
            self.grass = [Grass(random.uniform(0, self.config.map_width), random.uniform(0, self.config.map_height)) for _ in range(int(self.config.init_deer * 1.5))]
            self.death_effects = []
            
            self.history = {
                "labels": [],
                "deer": [],
                "lions": [],
                "grass": []
            }
            
    def update_config(self, new_config):
        with self.lock:
            self.config.update_from_dict(new_config)

    def step(self):
        with self.lock:
            # 1. Update Entities
            env_state = {'deer': self.deer, 'lions': self.lions, 'grass': self.grass}
            
            born_deer = []
            born_lions = []
            
            # Update Deer
            for d in self.deer:
                d.update(env_state, self.config)
                
                # Eat grass
                for i in range(len(self.grass) - 1, -1, -1):
                    g = self.grass[i]
                    if distance(d.x, d.y, g.x, g.y) < self.config.deer_eat_range:
                        d.food_eaten += 1
                        d.days_starving = 0
                        self.grass.pop(i)
                        
                        if d.food_eaten >= self.config.deer_food_req:
                            d.food_eaten = 0
                            born_deer.append(Deer(d.x + random.uniform(-10, 10), d.y + random.uniform(-10, 10)))
                        break
                        
            # Update Lions
            for l in self.lions:
                l.update(env_state, self.config)
                
                # Eat deer
                for i in range(len(self.deer) - 1, -1, -1):
                    d = self.deer[i]
                    if in_hiding_spot(d.x, d.y, self.config.hiding_spots):
                        continue
                        
                    if distance(l.x, l.y, d.x, d.y) < self.config.lion_eat_range:
                        l.food_eaten += 1
                        l.days_since_last_meal = 0
                        
                        self.death_effects.append({"x": round(d.x, 1), "y": round(d.y, 1)})
                        d.dead = True
                        self.deer.pop(i)
                        
                        if l.food_eaten >= self.config.lion_food_req:
                            l.food_eaten = 0
                            born_lions.append(Lion(l.x + random.uniform(-10, 10), l.y + random.uniform(-10, 10)))
                        break

            # Remove dead deer from iteration (handled by pop above)
            self.deer.extend(born_deer)
            self.lions.extend(born_lions)
            
            # Daily updates
            self.tick_count += 1
            if self.tick_count >= self.config.tick_rate:
                self.tick_count = 0
                self.day += 1
                
                # Grass Spawn (No Season)
                spawn_rate = self.config.grass_spawn_rate
                for _ in range(int(spawn_rate)):
                    if len(self.grass) >= self.config.max_grass:
                        break
                    if random.random() < 0.5 and len(self.grass) > 0:
                        parent = random.choice(self.grass)
                        self.grass.append(Grass(parent.x + random.uniform(-30, 30), parent.y + random.uniform(-30, 30)))
                    else:
                        self.grass.append(Grass(random.uniform(0, self.config.map_width), random.uniform(0, self.config.map_height)))
                        
                # Starvation and Old Age
                for i in range(len(self.deer) - 1, -1, -1):
                    d = self.deer[i]
                    d.days_starving += 1
                    d.age += 1
                    if d.days_starving > self.config.deer_starvation_days or d.age > self.config.deer_max_age:
                        self.death_effects.append({"x": round(d.x, 1), "y": round(d.y, 1)})
                        self.deer.pop(i)
                        
                for i in range(len(self.lions) - 1, -1, -1):
                    l = self.lions[i]
                    l.days_since_last_meal += 1
                    l.age += 1
                    if l.days_since_last_meal > self.config.lion_starvation_days or l.age > self.config.lion_max_age:
                        self.death_effects.append({"x": round(l.x, 1), "y": round(l.y, 1)})
                        self.lions.pop(i)
                        
                # History
                self.history['labels'].append(self.day)
                self.history['deer'].append(len(self.deer))
                self.history['lions'].append(len(self.lions))
                self.history['grass'].append(len(self.grass))

    def get_state(self):
        with self.lock:
            state = {
                "day": self.day,
                "season": self.season,
                "running": self.running,
                "deer": [d.to_dict() for d in self.deer],
                "lions": [l.to_dict() for l in self.lions],
                "grass": [g.to_dict() for g in self.grass],
                "hiding_spots": self.config.hiding_spots,
                "death_effects": list(self.death_effects),
                "history": self.history,
                "config": self.config.to_dict()
            }
            self.death_effects = [] # clear after reading
            return state

    def run_loop(self):
        self.running = True
        while self.running:
            # Execute multiple steps per tick for higher speeds
            steps = max(1, int(self.config.speed_mult))
            for _ in range(steps):
                if not self.running:
                    break
                self.step()
            
            # Adjust sleep time for slower speeds (like 0.5x)
            sleep_time = 1.0 / self.config.tick_rate
            if 0 < self.config.speed_mult < 1.0:
                sleep_time = sleep_time / self.config.speed_mult
            
            time.sleep(sleep_time)

    def start(self):
        if not self.running:
            threading.Thread(target=self.run_loop, daemon=True).start()

    def stop(self):
        self.running = False
