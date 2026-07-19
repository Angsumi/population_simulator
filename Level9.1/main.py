import os
import sys
import csv
import zlib
import struct
import json
import time
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

# Add current directory to path to ensure imports work cleanly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from simulation import Simulation

def draw_line(buf, width, height, x0, y0, x1, y1, color):
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    dx = abs(x1 - x0)
    dy = abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy
    
    while True:
        if 0 <= x0 < width and 0 <= y0 < height:
            idx = (y0 * width + x0) * 3
            buf[idx] = color[0]
            buf[idx+1] = color[1]
            buf[idx+2] = color[2]
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x0 += sx
        if e2 < dx:
            err += dx
            y0 += sy

def save_png(filename, width, height, buf):
    png = bytearray([137, 80, 78, 71, 13, 10, 26, 10])
    ihdr = struct.pack("!IIBBBBB", width, height, 8, 2, 0, 0, 0)
    def chunk(tag, data):
        return struct.pack("!I", len(data)) + tag + data + struct.pack("!I", zlib.crc32(tag + data))
    png += chunk(b"IHDR", ihdr)
    scanlines = bytearray()
    for y in range(height):
        scanlines.append(0)
        scanlines += buf[y * width * 3 : (y + 1) * width * 3]
    png += chunk(b"IDAT", zlib.compress(scanlines))
    png += chunk(b"IEND", b"")
    with open(filename, "wb") as f:
        f.write(png)

current_state_json = "{}"

class VisualizerHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global current_state_json
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            with open(os.path.join(os.path.dirname(__file__), 'index.html'), 'rb') as f:
                self.wfile.write(f.read())
        elif self.path == '/state':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(current_state_json.encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass

def start_server():
    server = HTTPServer(('127.0.0.1', 8080), VisualizerHandler)
    server.serve_forever()

def main():
    global current_state_json
    print("Initializing Ecosystem Simulation (Bare Python with Decoupled Real-time Visualizer)...")
    sim = Simulation()
    
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    print("Visualizer running at http://127.0.0.1:8080/ - Open your browser to watch the simulation live!")
    
    total_days = sim.config.simulation_days
    hiding_spots = sim.config.hiding_spots
    
    daily_age_data_deer = []
    daily_age_data_lion = []

    print(f"Running simulation for {total_days} days...")
    for day in range(1, total_days + 1):
        sim.step()
        
        d_juv = sum(1 for d in sim.deer if d.age < 2250)
        d_mat = sum(1 for d in sim.deer if 2250 <= d.age < 6750)
        d_adu = sum(1 for d in sim.deer if d.age >= 6750)
        
        l_juv = sum(1 for l in sim.lions if l.age < 3750)
        l_mat = sum(1 for l in sim.lions if 3750 <= l.age < 11250)
        l_adu = sum(1 for l in sim.lions if l.age >= 11250)
            
        # Serialize state decoupled from visualizer fetch rate
        state_dict = {
            'day': sim.visual_day,
            'hiding_spots': hiding_spots,
            'grass': [g.to_dict() for g in sim.grass],
            'deer': [d.to_dict() for d in sim.deer],
            'lions': [l.to_dict() for l in sim.lions],
            'history': sim.history,
            'pyramid_stats': {
                'deer_juv': d_juv, 'deer_mat': d_mat, 'deer_adu': d_adu,
                'lion_juv': l_juv, 'lion_mat': l_mat, 'lion_adu': l_adu
            }
        }
        current_state_json = json.dumps(state_dict)
        time.sleep(0.005) # Prevent GIL starvation so the HTTP thread can serve requests
        
        # Only log history and CSV/pyramid data periodically to avoid gigantic arrays
        if day % 60 == 0:
            daily_age_data_deer.append([day, d_juv, d_mat, d_adu])
            daily_age_data_lion.append([day, l_juv, l_mat, l_adu])
        
        if day % (60 * 20) == 0 or day == total_days:
            print(f"  Day {day}/{total_days} - Grass: {len(sim.grass)}, Deer: {len(sim.deer)}, Lions: {len(sim.lions)}")
            
        if day % (60 * 50) == 0:
            p_width = 800
            p_height = 300
            p_buf = bytearray([15, 23, 42] * (p_width * p_height))
            
            deer_counts = [d_adu, d_mat, d_juv]
            lion_counts = [l_adu, l_mat, l_juv]
            
            max_val = max(max(deer_counts), max(lion_counts), 1)
            bar_height = 40
            gap = 20
            start_y = 60
            mid_x = 400
            
            draw_line(p_buf, p_width, p_height, mid_x, 20, mid_x, p_height - 20, (255, 255, 255))
            
            for i in range(3):
                y = start_y + i * (bar_height + gap)
                
                # Deer Bar (left side, blue)
                d_len = int((deer_counts[i] / max_val) * 300)
                for by in range(y, y + bar_height):
                    draw_line(p_buf, p_width, p_height, mid_x - 10 - d_len, by, mid_x - 10, by, (59, 130, 246))
                    
                # Lion Bar (right side, orange)
                l_len = int((lion_counts[i] / max_val) * 300)
                for by in range(y, y + bar_height):
                    draw_line(p_buf, p_width, p_height, mid_x + 10, by, mid_x + 10 + l_len, by, (245, 158, 11))
                    
            pyramid_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f'age_pyramid_day_{day}.png')
            save_png(pyramid_path, p_width, p_height, p_buf)
            print(f"  Saved bare-metal age pyramid to {pyramid_path}")

    # 1. Output CSV data
    # "every run will output csv data with three column number of grass, deer and lion, every row for each day"
    csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'run1.csv')
    with open(csv_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['grass', 'deer', 'lion'])
        for g, d, l in zip(sim.history['grass'], sim.history['deer'], sim.history['lions']):
            writer.writerow([g, d, l])
    print(f"CSV data saved to {csv_path}")

    deer_csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'deer_age_pyramid.csv')
    with open(deer_csv_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['day', 'juvenile', 'mature', 'adult'])
        writer.writerows(daily_age_data_deer)
    print(f"Deer age pyramid data saved to {deer_csv_path}")
    
    lion_csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lion_age_pyramid.csv')
    with open(lion_csv_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['day', 'juvenile', 'mature', 'adult'])
        writer.writerows(daily_age_data_lion)
    print(f"Lion age pyramid data saved to {lion_csv_path}")

    # 2. Output PNG (Integrated 3 plots rendered via bare python)
    png_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'run1.png')
    
    width = 800
    height = 600
    # Create dark background (RGB: 15, 23, 42)
    buf = bytearray([15, 23, 42] * (width * height))
    
    # Subplots boundaries and parameters
    # Subplot 1 (Grass): Y from 50 to 180
    # Subplot 2 (Deer): Y from 230 to 360
    # Subplot 3 (Lion): Y from 410 to 540
    plots = [
        {"data": sim.history['grass'], "color": (16, 185, 129), "ymin": 50, "ymax": 180},
        {"data": sim.history['deer'], "color": (59, 130, 246), "ymin": 230, "ymax": 360},
        {"data": sim.history['lions'], "color": (245, 158, 11), "ymin": 410, "ymax": 540}
    ]
    
    xmin = 80
    xmax = 750
    
    for plot in plots:
        data = plot["data"]
        ymin = plot["ymin"]
        ymax = plot["ymax"]
        color = plot["color"]
        
        # Draw bounding boxes (axes) in gray (RGB: 71, 85, 105)
        gray = (71, 85, 105)
        draw_line(buf, width, height, xmin, ymin, xmax, ymin, gray)
        draw_line(buf, width, height, xmin, ymax, xmax, ymax, gray)
        draw_line(buf, width, height, xmin, ymin, xmin, ymax, gray)
        draw_line(buf, width, height, xmax, ymin, xmax, ymax, gray)
        
        # Plot lines
        max_val = max(data) if data and max(data) > 0 else 1
        n = len(data)
        
        for i in range(n - 1):
            x0 = xmin + (i / (n - 1)) * (xmax - xmin)
            y0 = ymax - (data[i] / max_val) * (ymax - ymin)
            x1 = xmin + ((i + 1) / (n - 1)) * (xmax - xmin)
            y1 = ymax - (data[i + 1] / max_val) * (ymax - ymin)
            
            draw_line(buf, width, height, x0, y0, x1, y1, color)
            # Make the line 2px bold
            draw_line(buf, width, height, x0, y0 + 1, x1, y1 + 1, color)
            draw_line(buf, width, height, x0 + 1, y0, x1 + 1, y1, color)

    save_png(png_path, width, height, buf)
    print(f"Integrated plots saved to {png_path}")

if __name__ == '__main__':
    main()
