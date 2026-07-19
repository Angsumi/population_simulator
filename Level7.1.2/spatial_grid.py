class SpatialGrid:
    def __init__(self, cell_size):
        self.cell_size = cell_size
        self.cells = {}
        
    def _get_cell_key(self, x, y):
        return (int(x // self.cell_size), int(y // self.cell_size))
        
    def clear(self):
        self.cells.clear()
        
    def add(self, entity, category):
        key = self._get_cell_key(entity.x, entity.y)
        if key not in self.cells:
            self.cells[key] = {'grass': [], 'deer': [], 'lions': []}
        self.cells[key][category].append(entity)
        
    def get_nearby(self, x, y, radius):
        min_cx = int((x - radius) // self.cell_size)
        max_cx = int((x + radius) // self.cell_size)
        min_cy = int((y - radius) // self.cell_size)
        max_cy = int((y + radius) // self.cell_size)
        
        nearby = {'grass': [], 'deer': [], 'lions': []}
        for cx in range(min_cx, max_cx + 1):
            for cy in range(min_cy, max_cy + 1):
                cell = self.cells.get((cx, cy))
                if cell:
                    nearby['grass'].extend(cell['grass'])
                    nearby['deer'].extend(cell['deer'])
                    nearby['lions'].extend(cell['lions'])
        return nearby
