import math
import random
from config import distance, in_hiding_spot

class Deer:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.vx = random.uniform(-1, 1)
        self.vy = random.uniform(-1, 1)
        self.radius = 3.5
        self.food_eaten = 0
        self.days_starving = 0
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
        speedMult = config.deer_forage_speed
        
        nearest_lion = None
        min_dist_l = config.deer_flee_dist
        
        for l in env_state['lions']:
            d = distance(self.x, self.y, l.x, l.y)
            if d < min_dist_l:
                min_dist_l = d
                nearest_lion = l
                
        if nearest_lion:
            if in_hiding_spot(self.x, self.y, config.hiding_spots):
                speedMult = config.deer_hide_speed
                nearest_spot = config.hiding_spots[0]
                for s in config.hiding_spots:
                    if distance(self.x, self.y, s['x'], s['y']) < distance(self.x, self.y, nearest_spot['x'], nearest_spot['y']):
                        nearest_spot = s
                steerX += (nearest_spot['x'] - self.x) * 0.1
                steerY += (nearest_spot['y'] - self.y) * 0.1
            else:
                urgency = 1 - (min_dist_l / config.deer_flee_dist)
                steerX += (self.x - nearest_lion.x) * (2 + urgency * 3)
                steerY += (self.y - nearest_lion.y) * (2 + urgency * 3)
                speedMult = config.deer_sprint_speed
                
                if min_dist_l < config.deer_seek_hide_dist:
                    nearest_spot = None
                    min_spot_dist = float('inf')
                    for s in config.hiding_spots:
                        d = distance(self.x, self.y, s['x'], s['y'])
                        if d < min_spot_dist:
                            min_spot_dist = d
                            nearest_spot = s
                    if nearest_spot and min_spot_dist > 5:
                        steerX += (nearest_spot['x'] - self.x) * 3.0
                        steerY += (nearest_spot['y'] - self.y) * 3.0
        else:
            if env_state['grass']:
                nearest_g = None
                min_dist_g = float('inf')
                step = max(1, len(env_state['grass']) // 60)
                for i in range(0, len(env_state['grass']), step):
                    g = env_state['grass'][i]
                    d = distance(self.x, self.y, g.x, g.y)
                    if d < min_dist_g:
                        min_dist_g = d
                        nearest_g = g
                if nearest_g:
                    steerX += (nearest_g.x - self.x) * 1.0
                    steerY += (nearest_g.y - self.y) * 1.0
                    if min_dist_g < config.deer_graze_dist:
                        speedMult = config.deer_graze_slowdown
            
            cx = 0
            cy = 0
            count = 0
            for d in env_state['deer']:
                if d != self and distance(self.x, self.y, d.x, d.y) < 60:
                    cx += d.x
                    cy += d.y
                    count += 1
            if count > 0:
                steerX += (cx/count - self.x) * 0.08
                steerY += (cy/count - self.y) * 0.08

        self.vx += steerX * 0.012
        self.vy += steerY * 0.012

        self.vx *= config.friction
        self.vy *= config.friction
        
        if abs(self.vx) < 0.15: self.vx += random.uniform(-0.6, 0.6)
        if abs(self.vy) < 0.15: self.vy += random.uniform(-0.6, 0.6)

        mag = math.hypot(self.vx, self.vy) or 1
        self.x += (self.vx / mag) * speedMult
        self.y += (self.vy / mag) * speedMult

        if self.x < 0: self.x = 2; self.vx = abs(self.vx)
        if self.x > config.map_width: self.x = config.map_width - 2; self.vx = -abs(self.vx)
        if self.y < 0: self.y = 2; self.vy = abs(self.vy)
        if self.y > config.map_height: self.y = config.map_height - 2; self.vy = -abs(self.vy)

    def to_dict(self):
        return {"x": round(self.x, 1), "y": round(self.y, 1)}
