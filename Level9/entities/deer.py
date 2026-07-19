import math
import random
import sys
import os

# Add parent directory to the system path to import from config.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config import distance, in_hiding_spot

class Deer:
    """
    Represents a Deer entity in the simulation.
    Deer graze on grass and flee from lions.
    """
    def __init__(self, x, y):
        """
        Initializes a new Deer object at the given coordinates.
        :param x: X-coordinate position
        :param y: Y-coordinate position
        """
        self.x = x
        self.y = y
        # Initial random velocity
        self.vx = random.uniform(-1, 1)
        self.vy = random.uniform(-1, 1)
        self.radius = 3.5  # Size of the deer
        self.food_eaten = 0  # Amount of food consumed (for reproduction)
        self.days_starving = 0  # Tracks days without food
        self.age = 0  # Age in days
        self.dead = False  # Alive/Dead status

    def get_border_repulsion(self, config):
        """
        Calculates repulsion forces to keep the deer within the map boundaries.
        :param config: Configuration object with map dimensions and border settings.
        :return: A tuple (fx, fy) representing the repulsion force vector.
        """
        fx = 0
        fy = 0
        # Check distance to left border
        if self.x < config.border_margin:
            fx += config.border_strength * (1 - self.x / config.border_margin)
        # Check distance to right border
        if self.x > config.map_width - config.border_margin:
            fx -= config.border_strength * (1 - (config.map_width - self.x) / config.border_margin)
        # Check distance to top border
        if self.y < config.border_margin:
            fy += config.border_strength * (1 - self.y / config.border_margin)
        # Check distance to bottom border
        if self.y > config.map_height - config.border_margin:
            fy -= config.border_strength * (1 - (config.map_height - self.y) / config.border_margin)
        return fx, fy

    def update(self, env_state, config):
        """
        Updates the deer's movement and behavior for the current time step.
        Evaluates surroundings (lions, grass, herd) to determine movement vectors.
        :param env_state: Current state of the environment (including the spatial grid).
        :param config: Simulation configuration parameters.
        """
        # Start with border repulsion forces
        steerX, steerY = self.get_border_repulsion(config)
        speedMult = config.deer_forage_speed  # Default speed multiplier
        
        # Retrieve nearby lions from the spatial grid
        nearby_lions = env_state['grid'].get_nearby(self.x, self.y, config.deer_flee_dist)['lions']
        
        nearest_lion = None
        min_dist_l_sq = config.deer_flee_dist ** 2
        
        # Find the nearest lion within fleeing distance
        for l in nearby_lions:
            if not l.dead:
                d_sq = (self.x - l.x)**2 + (self.y - l.y)**2
                if d_sq < min_dist_l_sq:
                    min_dist_l_sq = d_sq
                    nearest_lion = l
                
        # If there is a threat (lion nearby)
        if nearest_lion:
            min_dist_l = math.sqrt(min_dist_l_sq)
            # If the deer is currently in a hiding spot
            if in_hiding_spot(self.x, self.y, config.hiding_spots):
                speedMult = config.deer_hide_speed  # Slow down drastically while hiding
                
                # Find the nearest hiding spot to stay near the center
                nearest_spot = config.hiding_spots[0]
                for s in config.hiding_spots:
                    if (self.x - s['x'])**2 + (self.y - s['y'])**2 < (self.x - nearest_spot['x'])**2 + (self.y - nearest_spot['y'])**2:
                        nearest_spot = s
                
                # Steer slightly toward the center of the hiding spot
                dx = nearest_spot['x'] - self.x
                dy = nearest_spot['y'] - self.y
                dist = math.hypot(dx, dy) or 1
                steerX += (dx / dist) * 1.5
                steerY += (dy / dist) * 1.5
            else:
                # Deer is not hiding, so it must flee the nearest lion
                dx = self.x - nearest_lion.x
                dy = self.y - nearest_lion.y
                dist = math.hypot(dx, dy) or 1
                
                # Calculate urgency based on how close the lion is
                urgency = 1 - (min_dist_l / config.deer_flee_dist)
                
                # Steer away from the lion
                steerX += (dx / dist) * (2 + urgency * 3) * 12
                steerY += (dy / dist) * (2 + urgency * 3) * 12
                speedMult = config.deer_sprint_speed  # Sprint away
                
                # If the lion is very close, seek a hiding spot if possible
                if min_dist_l < config.deer_seek_hide_dist:
                    nearest_spot = None
                    min_spot_dist_sq = float('inf')
                    # Find the nearest hiding spot
                    for s in config.hiding_spots:
                        d_s_sq = (self.x - s['x'])**2 + (self.y - s['y'])**2
                        if d_s_sq < min_spot_dist_sq:
                            min_spot_dist_sq = d_s_sq
                            nearest_spot = s
                            
                    # Move towards the hiding spot if it is found and somewhat far
                    if nearest_spot and min_spot_dist_sq > 25: # 5*5
                        ds_x = nearest_spot['x'] - self.x
                        ds_y = nearest_spot['y'] - self.y
                        ds_dist = math.hypot(ds_x, ds_y) or 1
                        steerX += (ds_x / ds_dist) * 15.0
                        steerY += (ds_y / ds_dist) * 15.0
        else:
            # No lions nearby, so focus on foraging for grass
            nearby_grass = env_state['grid'].get_nearby(self.x, self.y, config.deer_flee_dist)['grass']
            if nearby_grass:
                nearest_g = None
                min_dist_g_sq = float('inf')
                # Step through a subset of grass to save computation (optimization)
                step = max(1, len(nearby_grass) // 20)
                for i in range(0, len(nearby_grass), step):
                    g = nearby_grass[i]
                    if not g.eaten:
                        d_g_sq = (self.x - g.x)**2 + (self.y - g.y)**2
                        if d_g_sq < min_dist_g_sq:
                            min_dist_g_sq = d_g_sq
                            nearest_g = g
                            
                # If grass is found, steer towards it
                if nearest_g:
                    dg_x = nearest_g.x - self.x
                    dg_y = nearest_g.y - self.y
                    dg_dist = math.hypot(dg_x, dg_y) or 1
                    steerX += (dg_x / dg_dist) * 8.0
                    steerY += (dg_y / dg_dist) * 8.0
                    # Slow down when very close to grass to graze
                    if min_dist_g_sq < config.deer_graze_dist**2:
                        speedMult = config.deer_graze_slowdown
            
            # Herding behavior: Check for other deer nearby
            nearby_deer = env_state['grid'].get_nearby(self.x, self.y, 60)['deer']
            cx = 0
            cy = 0
            count = 0
            # Calculate the center of mass of the nearby herd
            for d in nearby_deer:
                if d != self and not d.dead and (self.x - d.x)**2 + (self.y - d.y)**2 < 3600: # 60*60
                    cx += d.x
                    cy += d.y
                    count += 1
                    
            # Steer slightly toward the herd center
            if count > 0:
                dc_x = (cx/count) - self.x
                dc_y = (cy/count) - self.y
                dc_dist = math.hypot(dc_x, dc_y) or 1
                steerX += (dc_x / dc_dist) * 1.2
                steerY += (dc_y / dc_dist) * 1.2

        # Apply steering forces to velocity with some inertia/smoothing
        self.vx += steerX * 0.012
        self.vy += steerY * 0.012
        # Apply friction to simulate drag
        self.vx *= config.friction
        self.vy *= config.friction
        
        # Add slight random jitter to prevent getting permanently stuck
        if abs(self.vx) < 0.15: self.vx += random.uniform(-0.6, 0.6)
        if abs(self.vy) < 0.15: self.vy += random.uniform(-0.6, 0.6)

        # Normalize velocity vector and multiply by current speed multiplier
        mag = math.hypot(self.vx, self.vy) or 1
        self.x += (self.vx / mag) * speedMult
        self.y += (self.vy / mag) * speedMult

        # Hard boundary enforcement - bounce off walls if they get past repulsion
        if self.x < 0: self.x = 2; self.vx = abs(self.vx)
        if self.x > config.map_width: self.x = config.map_width - 2; self.vx = -abs(self.vx)
        if self.y < 0: self.y = 2; self.vy = abs(self.vy)
        if self.y > config.map_height: self.y = config.map_height - 2; self.vy = -abs(self.vy)

    def eat(self, env_state, config):
        """
        Attempts to eat nearby grass within eat range.
        :param env_state: Current state of the environment.
        :param config: Configuration object.
        """
        if self.age < 2250:
            return  # Juveniles do not graze
            
        # Find nearby grass patches
        nearby_grass = env_state['grid'].get_nearby(self.x, self.y, config.deer_eat_range)['grass']
        grass_eaten_today = 0
        
        for g in nearby_grass:
            if not g.eaten:
                if (self.x - g.x)**2 + (self.y - g.y)**2 < config.deer_eat_range**2:
                    g.eaten = True
                    grass_eaten_today += 1
                    self.days_starving = 0
                    if grass_eaten_today >= 5:
                        break

    def reproduce(self, config):
        """
        Handles reproduction logic. Only mature deer can reproduce, exactly 2 babies per year.
        :param config: Configuration object.
        :return: A list containing a new Deer object if reproduction occurred, otherwise empty list.
        """
        if self.age < 2250 or self.age >= 6750:
            return []  # Juveniles and Adults (Old) do not reproduce
            
        if self.age > 0 and self.age % config.days_per_year == 0:
            return [
                Deer(self.x, self.y),
                Deer(self.x, self.y)
            ]
        return []

    def daily_update(self, config):
        """
        Updates daily counters like starvation and age, checking for death conditions.
        :param config: Configuration object.
        """
        if self.age >= 2250:
            self.days_starving += 1
        self.age += 1
        
        # Deer dies if it starves too long (only if mature/adult) or exceeds its maximum lifespan
        if self.age >= 2250 and self.days_starving > config.deer_starvation_days:
            self.dead = True
        if self.age > config.deer_max_age:
            self.dead = True

    def to_dict(self):
        """
        Serializes the deer position for rendering/export.
        :return: A dictionary containing rounded x and y coordinates.
        """
        return {"x": round(self.x, 1), "y": round(self.y, 1)}
