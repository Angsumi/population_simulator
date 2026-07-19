from flask import Flask, jsonify, render_template, request
from simulation import Simulation

app = Flask(__name__)
sim = Simulation()
sim.start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/state', methods=['GET'])
def get_state():
    return jsonify(sim.get_state())

@app.route('/config', methods=['POST'])
def update_config():
    data = request.json
    sim.update_config(data)
    return jsonify({"status": "success"})

@app.route('/reset', methods=['POST'])
def reset():
    sim.reset()
    return jsonify({"status": "success"})

@app.route('/play', methods=['POST'])
def play():
    sim.start()
    return jsonify({"status": "success", "running": sim.running})

@app.route('/pause', methods=['POST'])
def pause():
    sim.stop()
    return jsonify({"status": "success", "running": sim.running})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
