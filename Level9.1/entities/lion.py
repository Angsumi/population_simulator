import math
import random
import sys
import os

# Add parent directory to the system path to import from config.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config import distance, in_hiding_spot

class Lion:
    """
    Represents a Lion entity in the simulation.
    Lions hunt deer and wander the map.
    """
    def __init__(self, x, y):
        """
        Initializes a new Lion object.
        :param x: X-coordinate position
        :param y: Y-coordinate position
        """
        self.x = x
        self.y = y
        # Initial random velocity
        self.vx = random.uniform(-1, 1)
        self.vy = random.uniform(-1, 1)
        self.radius = 5.5  # Size of the lion
        self.state = 'wander'  # Current behavioral state ('wander', 'stalk', 'pounce')
        self.food_eaten = 0  # Amount of food consumed (for reproduction)
        self.days_since_last_meal = random.randint(0, 10)  # Randomize initial hunger
        self.age = 0  # Age in days
        self.dead = False  # Alive/Dead status
        self.hunt_cooldown = 0  # Cooldown timer after a failed hunt

    def get_border_repulsion(self, config):
        """
        Calculates repulsion forces to keep the lion within map boundaries.
        :param config: Configuration object.
        :return: A tuple (fx, fy) representing the repulsion force vector.
        """
        fx = 0
        fy = 0
        # Check distance to borders and apply proportional repulsion
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
        """
        Updates the lion's movement and behavior for the current time step.
        Evaluates surroundings to choose whether to stalk, pounce on deer, or wander.
        :param env_state: Current state of the environment.
        :param config: Simulation configuration parameters.
        """
        # Start with border repulsion
        steerX, steerY = self.get_border_repulsion(config)
        speedMult = config.lion_wander_speed
        
        nearest_deer = None
        min_dist_sq = float('inf')
        
        # Check if the lion is resting after a failed hunt
        if getattr(self, 'hunt_cooldown', 0) > 0:
            self.hunt_cooldown -= 1
            self.state = 'wander'
        else:
            # Look for nearby deer within stalking distance
            nearby_deer = env_state['grid'].get_nearby(self.x, self.y, config.lion_stalk_dist)['deer']
            
            # Find the closest deer target
            for d in nearby_deer:
                if d.dead: continue
                
                # Deer hiding spots reduce the effective stalking distance of the lion
                is_hiding = in_hiding_spot(d.x, d.y, config.hiding_spots)
                effective_stalk_dist = config.lion_stalk_dist * 0.2 if is_hiding else config.lion_stalk_dist
                
                # Check distance and update nearest deer if closer
                d_sq = (self.x - d.x)**2 + (self.y - d.y)**2
                if d_sq <= effective_stalk_dist**2 and d_sq < min_dist_sq:
                    min_dist_sq = d_sq
                    nearest_deer = d
                    
            # If a valid deer target is found
            if nearest_deer:
                min_dist = math.sqrt(min_dist_sq)
                dx = nearest_deer.x - self.x
                dy = nearest_deer.y - self.y
                chase_dist = math.hypot(dx, dy) or 1
                
                # Determine hunting state based on distance
                if min_dist < config.lion_pounce_dist:
                    # Very close: Pounce at high speed
                    self.state = 'pounce'
                    speedMult = config.lion_pounce_speed
                    steerX += (dx / chase_dist) * 15.0
                    steerY += (dy / chase_dist) * 15.0
                elif min_dist <= config.lion_stalk_dist:
                    # Within stalk range: Stalk carefully
                    self.state = 'stalk'
                    speedMult = config.lion_stalk_speed
                    steerX += (dx / chase_dist) * 8.0
                    steerY += (dy / chase_dist) * 8.0
                else:
                    # Target lost or too far: Wander back slowly
                    self.state = 'wander'
                    speedMult = config.lion_wander_speed
                    steerX += (dx / chase_dist) * 2.0
                    steerY += (dy / chase_dist) * 2.0
            else:
                # No deer found, revert to wandering
                self.state = 'wander'
                speedMult = config.lion_wander_speed

        # Group behavior while wandering: stay near other lions
        if self.state == 'wander':
            nearby_lions = env_state['grid'].get_nearby(self.x, self.y, config.lion_cluster_dist)['lions']
            cx = 0
            cy = 0
            count = 0
            # Calculate the center of mass of nearby lions
            for l in nearby_lions:
                if l != self and not l.dead and (self.x - l.x)**2 + (self.y - l.y)**2 < config.lion_cluster_dist**2:
                    cx += l.x
                    cy += l.y
                    count += 1
            # Steer slightly toward the group center
            if count > 0:
                dc_x = (cx/count) - self.x
                dc_y = (cy/count) - self.y
                dc_dist = math.hypot(dc_x, dc_y) or 1
                steerX += (dc_x / dc_dist) * 1.5
                steerY += (dc_y / dc_dist) * 1.5
        
        # Apply steering forces to velocity
        self.vx += steerX * 0.02
        self.vy += steerY * 0.02
        # Apply friction
        self.vx *= config.friction
        self.vy *= config.friction
        
        # Prevent completely stopping by adding a random jitter
        if abs(self.vx) < 0.15: self.vx += random.uniform(-0.4, 0.4)
        if abs(self.vy) < 0.15: self.vy += random.uniform(-0.4, 0.4)

        # Normalize velocity and move the lion
        mag = math.hypot(self.vx, self.vy) or 1
        self.x += (self.vx / mag) * speedMult
        self.y += (self.vy / mag) * speedMult

        # Hard boundary enforcement
        if self.x < 0: self.x = 2; self.vx = abs(self.vx)
        if self.x > config.map_width: self.x = config.map_width - 2; self.vx = -abs(self.vx)
        if self.y < 0: self.y = 2; self.vy = abs(self.vy)
        if self.y > config.map_height: self.y = config.map_height - 2; self.vy = -abs(self.vy)

    def eat(self, env_state, config):
        """
        Attempts to eat a deer within eat range.
        Handles hunting success chance and cooldowns on failure.
        :param env_state: Current state of the environment.
        :param config: Configuration object.
        """
        if self.age < 3750:
            return  # Juveniles do not hunt
            
        nearby_deer = env_state['grid'].get_nearby(self.x, self.y, config.lion_eat_range)['deer']
        deer_eaten_today = 0
        
        for d in nearby_deer:
            if not d.dead:
                if (self.x - d.x)**2 + (self.y - d.y)**2 < config.lion_eat_range**2:
                    d.dead = True
                    deer_eaten_today += 1
                    self.days_since_last_meal = 0
                    if deer_eaten_today >= 1:
                        break

    def reproduce(self, config):
        """
        Handles reproduction logic. Only mature lions reproduce, exactly 1 baby every 2 years.
        :param config: Configuration object.
        :return: A list containing a new Lion object if reproduction occurred, otherwise empty list.
        """
        if self.age < 3750 or self.age >= 11250:
            return []  # Juveniles and Adults (Old) do not reproduce
            
        if self.age > 0 and self.age % (config.days_per_year * 2) == 0:
            return [
                Lion(self.x, self.y)
            ]
        return []

    def daily_update(self, config):
        """
        Updates daily counters like starvation and age, checking for death conditions.
        :param config: Configuration object.
        """
        if self.age >= 3750:
            self.days_since_last_meal += 1
        self.age += 1
        
        # Lion dies if it starves for too long (only if mature/adult) or exceeds maximum lifespan
        if self.age >= 3750 and self.days_since_last_meal > config.lion_starvation_days:
            self.dead = True
        if self.age > config.lion_max_age:
            self.dead = True

    def to_dict(self):
        """
        Serializes the lion state for rendering/export.
        :return: A dictionary containing position and current behavioral state.
        """
        return {"x": round(self.x, 1), "y": round(self.y, 1), "state": self.state}
