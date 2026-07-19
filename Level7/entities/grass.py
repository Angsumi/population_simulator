class Grass:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.radius = 2

    def to_dict(self):
        return {"x": round(self.x, 1), "y": round(self.y, 1)}
