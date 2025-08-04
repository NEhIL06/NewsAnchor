from flask import Flask, request, jsonify, send_file
from elevenlabs import ElevenLabs
import os
import traceback
app = Flask(__name__)

# Initialize ElevenLabs client
client = ElevenLabs(api_key="sk_3e1ea3db13d9665ec708e3de4f0e20d18f61a0f6ee49efad")  # Replace with your API key

@app.route('/generate-speech', methods=['POST'])
def generate_speech():
    try:
        data = request.json
        text = data.get("text")
        filename = data.get("filename", "output.mp3")  # Default filename if not provided
        

        if not text:
            return jsonify({"error": "Text is required"}), 400

        # Generate speech
        audio_generator = client.generate(
              
            text=text,
            voice="MF3mGyEYCl7XYWbV9V6O"
        )


        # Convert generator to bytes
        audio_bytes = b"".join(audio_generator)

        # Save as MP3
        SAVE_DIR = r"F:\Desktop\MiniNews\backend" #Yaha par apna file path dalna hai

        # Ensure the directory exists
        os.makedirs(SAVE_DIR, exist_ok=True)

        # Generate the full file path using the provided filename from JSON
        file_path = os.path.join(SAVE_DIR, filename)

        # Save the audio file
        with open(file_path, "wb") as f:
            f.write(audio_bytes)
        
        return send_file(file_path, as_attachment=True)  # Send back the file

    except Exception as e:
        print("Error occurred:", str(e))
        traceback.print_exc() 
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
