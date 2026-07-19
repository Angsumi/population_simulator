import math
import random

class Config:
    def __init__(self):
        # General Map (Arena X-Y Axis)
        self.map_width = 1200
        self.map_height = 440
        
        # Environment
        self.grass_spawn_rate = 10
        self.max_grass = 1500
        
        # Physics / Movement
        self.friction = 0.93
        self.border_margin = 50
        
        # 1 Tick = 1 Day
        self.simulation_days = 30000
        self.days_per_year = 365
        
        # Initial Population
        self.init_deer = 300
        self.init_lions = 30
        self.init_grass = 400
        
        # Grass parameters
        self.grass_growth_rate = 0.05
        
        # Deer parameters (scaled by 60 to maintain logic with 1 tick = 1 day)
        self.deer_speed = 3.0
        self.deer_vision = 60
        self.deer_eat_range = 10
        self.deer_starvation_days = 300
        self.deer_max_age = 9000
        
        # Lion parameters (scaled by 60)
        self.lion_speed = 3.5
        self.lion_vision = 100
        self.lion_eat_range = 15
        self.lion_starvation_days = 300
        self.lion_max_age = 15000
        self.border_strength = 3.0
        
        # Hiding Spots (x, y, rx, ry)
        self.hiding_spots = [
            {"x": 180, "y": 120, "rx": 50, "ry": 35},
            {"x": 980, "y": 320, "rx": 50, "ry": 35},
            {"x": 600, "y": 220, "rx": 60, "ry": 40},
            {"x": 150, "y": 350, "rx": 45, "ry": 30},
            {"x": 1050, "y": 100, "rx": 45, "ry": 30}
        ]
        
        # Deer AI Parameters
        self.deer_flee_dist = 130
        self.deer_seek_hide_dist = 80
        self.deer_sprint_speed = 3.0
        self.deer_forage_speed = 1.0
        self.deer_graze_slowdown = 0.5
        self.deer_hide_speed = 0.5
        self.deer_graze_dist = 15
        self.deer_eat_range = 10
        
        # Lion AI Parameters
        self.lion_wander_speed = 2.0
        self.lion_stalk_speed = 1.5
        self.lion_pounce_speed = 3.2
        self.lion_pounce_dist = 40
        self.lion_stalk_dist = 120
        self.lion_eat_range = 15
        self.lion_cluster_dist = 150

    def to_dict(self):
        return {k: v for k, v in self.__dict__.items() if not k.startswith('__')}
        
    def update_from_dict(self, data):
        for k, v in data.items():
            if hasattr(self, k):
                current_type = type(getattr(self, k))
                if current_type == list:
                    setattr(self, k, v)
                else:
                    try:
                        setattr(self, k, current_type(v))
                    except (ValueError, TypeError):
                        pass


# Shared Math Utility
def distance(x1, y1, x2, y2):
    return math.hypot(x2 - x1, y2 - y1)

def in_hiding_spot(x, y, spots):
    for s in spots:
        dx = (x - s['x']) / s['rx']
        dy = (y - s['y']) / s['ry']
        if dx*dx + dy*dy < 1:
            return True
    return False
