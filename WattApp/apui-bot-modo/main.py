from flask import Flask, request, jsonify
from detoxify import Detoxify
from nudenet import NudeClassifier
import os

app = Flask(__name__)

# Load models once at startup
text_model = Detoxify('original')
image_model = NudeClassifier()

@app.route('/moderate/text', methods=['POST'])
def moderate_text():
    data = request.json
    text = data.get('text', '')
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    result = text_model.predict(text)
    return jsonify(result)

@app.route('/moderate/image', methods=['POST'])
def moderate_image():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    filepath = os.path.join('/tmp', file.filename)
    file.save(filepath)
    result = image_model.classify(filepath)
    os.remove(filepath)
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
