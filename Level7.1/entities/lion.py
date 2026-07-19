import math
import random
import sys
import os

# Ensure config can be imported if entities is run directly or from parent
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config import distance, in_hiding_spot

class Lion:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.vx = random.uniform(-1, 1)
        self.vy = random.uniform(-1, 1)
        self.radius = 5.5
        self.state = 'wander'
        self.food_eaten = 0
        self.days_since_last_meal = random.randint(0, 10)
        self.age = 0
        self.dead = False

    def get_border_repulsion(self, config):
        fx = 0
        fy = 0
        if self.x < config.border_margin:
            fx += config.border_strength * (1 - self.x / config.border_margin)
        if self.x > config.map_width - config.border_margin:
            fx -= config.border_strength * (1 - (config.map_width - self.x) / config.border_margin)
        if self.y < config.border_margin:
            fy += config.border_strength * (1 - self.y / config.border_margin)
        if self.y > config.map_height - config.border_margin:
            fy -= config.border_strength * (1 - (config.map_height - self.y) / config.border_margin)
        return fx, fy

    def update(self, env_state, config):
        steerX, steerY = self.get_border_repulsion(config)
        speedMult = config.lion_wander_speed
        
        nearest_deer = None
        min_dist = float('inf')
        
        for d in env_state['deer']:
            if in_hiding_spot(d.x, d.y, config.hiding_spots):
                continue
            dist = distance(self.x, self.y, d.x, d.y)
            if dist < min_dist:
                min_dist = dist
                nearest_deer = d
                
        if nearest_deer:
            # Normalized chasing steering vector
            dx = nearest_deer.x - self.x
            dy = nearest_deer.y - self.y
            chase_dist = math.hypot(dx, dy) or 1
            
            if min_dist < config.lion_pounce_dist:
                if not in_hiding_spot(nearest_deer.x, nearest_deer.y, config.hiding_spots):
                    self.state = 'pounce'
                    speedMult = config.lion_pounce_speed
                    steerX += (dx / chase_dist) * 15.0
                    steerY += (dy / chase_dist) * 15.0
                else:
                    self.state = 'wander'
                    speedMult = config.lion_wander_speed
            elif min_dist <= config.lion_stalk_dist:
                self.state = 'stalk'
                speedMult = config.lion_stalk_speed
                steerX += (dx / chase_dist) * 8.0
                steerY += (dy / chase_dist) * 8.0
            else:
                self.state = 'wander'
                speedMult = config.lion_wander_speed
                steerX += (dx / chase_dist) * 2.0
                steerY += (dy / chase_dist) * 2.0
        else:
            self.state = 'wander'
            speedMult = config.lion_wander_speed

        if self.state == 'wander':
            # Cluster with other lions (normalized vector)
            cx = 0
            cy = 0
            count = 0
            for l in env_state['lions']:
                if l != self and distance(self.x, self.y, l.x, l.y) < config.lion_cluster_dist:
                    cx += l.x
                    cy += l.y
                    count += 1
            if count > 0:
                dc_x = (cx/count) - self.x
                dc_y = (cy/count) - self.y
                dc_dist = math.hypot(dc_x, dc_y) or 1
                steerX += (dc_x / dc_dist) * 1.5
                steerY += (dc_y / dc_dist) * 1.5
        
        self.vx += steerX * 0.02
        self.vy += steerY * 0.02

        self.vx *= config.friction
        self.vy *= config.friction
        
        if abs(self.vx) < 0.15: self.vx += random.uniform(-0.4, 0.4)
        if abs(self.vy) < 0.15: self.vy += random.uniform(-0.4, 0.4)

        mag = math.hypot(self.vx, self.vy) or 1
        self.x += (self.vx / mag) * speedMult
        self.y += (self.vy / mag) * speedMult

        if self.x < 0: self.x = 2; self.vx = abs(self.vx)
        if self.x > config.map_width: self.x = config.map_width - 2; self.vx = -abs(self.vx)
        if self.y < 0: self.y = 2; self.vy = abs(self.vy)
        if self.y > config.map_height: self.y = config.map_height - 2; self.vy = -abs(self.vy)

    def eat_and_reproduce(self, deer_list, config):
        from config import in_hiding_spot
        born_lions = []
        for i in range(len(deer_list) - 1, -1, -1):
            d = deer_list[i]
            if in_hiding_spot(d.x, d.y, config.hiding_spots):
                continue
            if distance(self.x, self.y, d.x, d.y) < config.lion_eat_range:
                self.food_eaten += 1
                self.days_since_last_meal = 0
                d.dead = True
                deer_list.pop(i)
                
                if self.food_eaten >= config.lion_food_req:
                    self.food_eaten = 0
                    born_lions.append(Lion(self.x + random.uniform(-10, 10), self.y + random.uniform(-10, 10)))
                break
        return born_lions

    def daily_update(self, config):
        self.days_since_last_meal += 1
        self.age += 1
        if self.days_since_last_meal > config.lion_starvation_days or self.age > config.lion_max_age:
            self.dead = True

    def to_dict(self):
        return {"x": round(self.x, 1), "y": round(self.y, 1), "state": self.state}
