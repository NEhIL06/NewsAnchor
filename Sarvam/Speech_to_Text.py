from flask import Flask, request, jsonify
import requests
import os

app = Flask(__name__)

API_URL = "https://api.sarvam.ai/speech-to-text"
API_KEY = ""  

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        audio_file = request.files['file']

        payload = {
            'model': 'saarika:v1',
            'language_code': 'en-IN',
            'with_timesteps': 'false'
        }

        headers = {'api-subscription-key': API_KEY}
        files = {'file': (audio_file.filename, audio_file, 'audio/wav')}
        response = requests.post(API_URL, headers=headers, data=payload, files=files)

        return jsonify({"transcript": response.json().get('transcript', 'No transcript available.')})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=8080)
