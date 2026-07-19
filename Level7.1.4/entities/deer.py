import math
import random
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
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
        
        nearby_lions = env_state['grid'].get_nearby(self.x, self.y, config.deer_flee_dist)['lions']
        
        nearest_lion = None
        min_dist_l_sq = config.deer_flee_dist ** 2
        
        for l in nearby_lions:
            if not l.dead:
                d_sq = (self.x - l.x)**2 + (self.y - l.y)**2
                if d_sq < min_dist_l_sq:
                    min_dist_l_sq = d_sq
                    nearest_lion = l
                
        if nearest_lion:
            min_dist_l = math.sqrt(min_dist_l_sq)
            if in_hiding_spot(self.x, self.y, config.hiding_spots):
                speedMult = config.deer_hide_speed
                nearest_spot = config.hiding_spots[0]
                for s in config.hiding_spots:
                    if (self.x - s['x'])**2 + (self.y - s['y'])**2 < (self.x - nearest_spot['x'])**2 + (self.y - nearest_spot['y'])**2:
                        nearest_spot = s
                
                dx = nearest_spot['x'] - self.x
                dy = nearest_spot['y'] - self.y
                dist = math.hypot(dx, dy) or 1
                steerX += (dx / dist) * 1.5
                steerY += (dy / dist) * 1.5
            else:
                dx = self.x - nearest_lion.x
                dy = self.y - nearest_lion.y
                dist = math.hypot(dx, dy) or 1
                urgency = 1 - (min_dist_l / config.deer_flee_dist)
                
                steerX += (dx / dist) * (2 + urgency * 3) * 12
                steerY += (dy / dist) * (2 + urgency * 3) * 12
                speedMult = config.deer_sprint_speed
                
                if min_dist_l < config.deer_seek_hide_dist:
                    nearest_spot = None
                    min_spot_dist_sq = float('inf')
                    for s in config.hiding_spots:
                        d_s_sq = (self.x - s['x'])**2 + (self.y - s['y'])**2
                        if d_s_sq < min_spot_dist_sq:
                            min_spot_dist_sq = d_s_sq
                            nearest_spot = s
                    if nearest_spot and min_spot_dist_sq > 25: # 5*5
                        ds_x = nearest_spot['x'] - self.x
                        ds_y = nearest_spot['y'] - self.y
                        ds_dist = math.hypot(ds_x, ds_y) or 1
                        steerX += (ds_x / ds_dist) * 15.0
                        steerY += (ds_y / ds_dist) * 15.0
        else:
            nearby_grass = env_state['grid'].get_nearby(self.x, self.y, config.deer_flee_dist)['grass']
            if nearby_grass:
                nearest_g = None
                min_dist_g_sq = float('inf')
                step = max(1, len(nearby_grass) // 20)
                for i in range(0, len(nearby_grass), step):
                    g = nearby_grass[i]
                    if not g.eaten:
                        d_g_sq = (self.x - g.x)**2 + (self.y - g.y)**2
                        if d_g_sq < min_dist_g_sq:
                            min_dist_g_sq = d_g_sq
                            nearest_g = g
                if nearest_g:
                    dg_x = nearest_g.x - self.x
                    dg_y = nearest_g.y - self.y
                    dg_dist = math.hypot(dg_x, dg_y) or 1
                    steerX += (dg_x / dg_dist) * 8.0
                    steerY += (dg_y / dg_dist) * 8.0
                    if min_dist_g_sq < config.deer_graze_dist**2:
                        speedMult = config.deer_graze_slowdown
            
            nearby_deer = env_state['grid'].get_nearby(self.x, self.y, 60)['deer']
            cx = 0
            cy = 0
            count = 0
            for d in nearby_deer:
                if d != self and not d.dead and (self.x - d.x)**2 + (self.y - d.y)**2 < 3600: # 60*60
                    cx += d.x
                    cy += d.y
                    count += 1
            if count > 0:
                dc_x = (cx/count) - self.x
                dc_y = (cy/count) - self.y
                dc_dist = math.hypot(dc_x, dc_y) or 1
                steerX += (dc_x / dc_dist) * 1.2
                steerY += (dc_y / dc_dist) * 1.2

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

    def eat_and_reproduce(self, env_state, config):
        born_deer = []
        nearby_grass = env_state['grid'].get_nearby(self.x, self.y, config.deer_eat_range)['grass']
        
        for g in nearby_grass:
            if not g.eaten:
                if (self.x - g.x)**2 + (self.y - g.y)**2 < config.deer_eat_range**2:
                    self.food_eaten += 1
                    self.days_starving = 0
                    g.eaten = True
                    if self.food_eaten >= config.deer_food_req:
                        self.food_eaten = 0
                        born_deer.append(Deer(self.x + random.uniform(-10, 10), self.y + random.uniform(-10, 10)))
                    break
        return born_deer

    def daily_update(self, config):
        self.days_starving += 1
        self.age += 1
        if self.days_starving > config.deer_starvation_days or self.age > config.deer_max_age:
            self.dead = True

    def to_dict(self):
        return {"x": round(self.x, 1), "y": round(self.y, 1)}
