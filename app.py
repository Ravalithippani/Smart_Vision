import os
import io
import torch
import torch.nn.functional as F
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename

# --- AI / ML IMPORTS (Hugging Face) ---
from transformers import (
    AutoModelForImageClassification,
    AutoImageProcessor,
    AutoModelForAudioClassification,
    AutoFeatureExtractor
)
import librosa
import numpy as np
from PIL import Image

# --- FLASK SETUP ---
app = Flask(__name__, template_folder='templates')
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# --- MODEL CONFIGURATION ---
# Recommended strong public models (Jan 2026)
IMAGE_MODEL_NAME = "dima806/deepfake_vs_real_image_detection"      # Very popular & good generalization
# Alternative strong options:
# IMAGE_MODEL_NAME = "prithivMLmods/Deep-Fake-Detector-v2-Model"
# IMAGE_MODEL_NAME = "prithivMLmods/deepfake-detector-model-v1"

AUDIO_MODEL_NAME = "Gustking/wav2vec2-large-xlsr-deepfake-audio-classification"

# --- GLOBAL VARIABLES ---
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Running on device: {device}")

image_model = None
image_processor = None
audio_model = None
audio_feature_extractor = None

# --- LOAD IMAGE MODEL ---
def load_image_model():
    global image_model, image_processor
    try:
        print(f"📥 Loading Image Model: {IMAGE_MODEL_NAME} ...")
        image_model = AutoModelForImageClassification.from_pretrained(IMAGE_MODEL_NAME)
        image_model.to(device)
        image_model.eval()

        image_processor = AutoImageProcessor.from_pretrained(IMAGE_MODEL_NAME)

        print(f"✅ Image Model loaded.")
        print(f"   Labels: {image_model.config.id2label}")
    except Exception as e:
        print(f"❌ Error loading Image Model: {e}")

# --- LOAD AUDIO MODEL ---
def load_audio_model():
    global audio_model, audio_feature_extractor
    try:
        print(f"📥 Loading Audio Model: {AUDIO_MODEL_NAME} ...")
        audio_model = AutoModelForAudioClassification.from_pretrained(AUDIO_MODEL_NAME)
        audio_model.to(device)
        audio_model.eval()

        audio_feature_extractor = AutoFeatureExtractor.from_pretrained(AUDIO_MODEL_NAME)

        print(f"✅ Audio Model loaded.")
        print(f"   Labels: {audio_model.config.id2label}")
    except Exception as e:
        print(f"❌ Error loading Audio Model: {e}")

# Load models once at startup
load_image_model()
load_audio_model()

# --- ROUTES ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload')
def upload_page():
    return render_template('analyze.html')

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    is_image = file.content_type.startswith('image/')
    is_audio = file.content_type.startswith('audio/')

    if not is_image and not is_audio:
        return jsonify({'error': 'Unsupported file format (only images & audio)'}), 400

    result_data = {}

    try:
        if is_image:
            if image_model is None:
                return jsonify({'error': 'Image model failed to load'}), 500

            # Read and process image
            image_bytes = file.read()
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')

            # Preprocess
            inputs = image_processor(images=image, return_tensors="pt")
            inputs = {k: v.to(device) for k, v in inputs.items()}

            # Inference
            with torch.no_grad():
                outputs = image_model(**inputs)
                logits = outputs.logits
                probs = F.softmax(logits, dim=-1)

            # Diagnostic output (very helpful!)
            print("--- IMAGE PREDICTION ---")
            print(f"Probabilities: {probs.tolist()[0]}")
            print(f"Logits: {logits.tolist()[0]}")

            # Get probabilities
            probs_list = probs[0].tolist()

            # Most models use index 0 = fake / manipulated, 1 = real
            # But we check config to be safe
            id2label = image_model.config.id2label
            fake_idx = None
            real_idx = None

            for idx, label in id2label.items():
                label_lower = str(label).lower()
                if "fake" in label_lower or "manip" in label_lower or "deep" in label_lower:
                    fake_idx = int(idx)
                if "real" in label_lower or "auth" in label_lower or "genuine" in label_lower:
                    real_idx = int(idx)

            if fake_idx is None:
                fake_idx = 0  # fallback assumption
            if real_idx is None:
                real_idx = 1

            fake_prob = probs_list[fake_idx]
            real_prob = probs_list[real_idx]

            confidence_score = max(fake_prob, real_prob) * 100
            is_fake = fake_prob > real_prob

            verdict = "FAKE (Deepfake Detected)" if is_fake else "REAL (Authentic)"
            summary = (
                f"Deepfake probability: {fake_prob*100:.1f}% – likely manipulated."
                if is_fake
                else f"Authentic probability: {real_prob*100:.1f}% – appears genuine."
            )

            conf_level = "High" if confidence_score > 85 else "Medium" if confidence_score > 60 else "Low (Uncertain)"

            result_data = {
                "type": "Image",
                "verdict": verdict,
                "fake_probability_percent": round(fake_prob * 100, 2),
                "confidence_score": round(confidence_score, 2),
                "confidence_level": conf_level,
                "metrics": {
                    "model": IMAGE_MODEL_NAME.split('/')[-1],
                    "raw_probs": [round(p*100, 1) for p in probs_list]
                },
                "summary": summary
            }

        elif is_audio:
            if audio_model is None:
                return jsonify({'error': 'Audio model failed to load'}), 500

            # Save temp file
            filename = secure_filename(file.filename)
            temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(temp_path)

            # Load & resample
            y, sr = librosa.load(temp_path, sr=16000)
            max_len = 16000 * 8  # allow up to ~8 seconds
            if len(y) > max_len:
                y = y[:max_len]

            # Preprocess
            inputs = audio_feature_extractor(
                y, sampling_rate=16000, return_tensors="pt", padding=True
            )
            inputs = {k: v.to(device) for k, v in inputs.items()}

            # Inference
            with torch.no_grad():
                outputs = audio_model(**inputs)
                logits = outputs.logits
                probs = F.softmax(logits, dim=-1)

            probs_list = probs[0].tolist()

            print("--- AUDIO PREDICTION ---")
            print(f"Probabilities: {probs_list}")

            # Assume common mapping: 0=real, 1=fake (check printed labels!)
            fake_prob = probs_list[1] if len(probs_list) > 1 else 0.0
            real_prob = probs_list[0]

            is_fake = fake_prob > real_prob
            confidence_score = max(fake_prob, real_prob) * 100

            verdict = "FAKE (Synthetic Voice)" if is_fake else "REAL (Natural Voice)"
            summary = (
                f"Synthetic probability: {fake_prob*100:.1f}%"
                if is_fake
                else f"Natural probability: {real_prob*100:.1f}%"
            )

            conf_level = "High" if confidence_score > 85 else "Medium" if confidence_score > 60 else "Low (Uncertain)"

            result_data = {
                "type": "Audio",
                "verdict": verdict,
                "fake_probability_percent": round(fake_prob * 100, 2),
                "confidence_score": round(confidence_score, 2),
                "confidence_level": conf_level,
                "metrics": {
                    "model": "Wav2Vec2-XLSR (Gustking)",
                    "raw_probs": [round(p*100, 1) for p in probs_list]
                },
                "summary": summary
            }

            # Cleanup
            if os.path.exists(temp_path):
                os.remove(temp_path)

        return jsonify(result_data)

    except Exception as e:
        print(f"Prediction Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000, threaded=True)