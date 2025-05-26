from flask import Flask, request, jsonify, render_template,send_file
import requests
import tempfile
from flask_cors import CORS
import google.generativeai as genai
import os
import pytesseract
import fitz  # PyMuPDF
from PIL import Image
import base64
import io

ELEVENLABS_API_KEY = 'sk_917d16326054c5e73036d42d3c17edcbbdede8220d8043a1'
ELEVENLABS_VOICE_ID  = 'FGY2WhTYpPnrIDTdsKH5'
app = Flask(__name__)
CORS(app)

app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

url = "https://api.elevenlabs.io/v1/voices"
headers = {
    "xi-api-key": ELEVENLABS_API_KEY
}

response = requests.get(url, headers=headers)
voices = response.json()
for voice in voices.get("voices", []):
    print(f"Name: {voice['name']} | ID: {voice['voice_id']}")


# Configure Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Configure Gemini
GOOGLE_API_KEY = "AIzaSyBlxLnNl8BkoOxkpuTguN1KUYo86kN7H5E"
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("gemini-2.0-flash")

# @app.route('/dictate', methods=['POST'])
# def dictate_text():
#     data = request.get_json()
#     text = data.get("text", "")
#     words_per_chunk = data.get("words_per_chunk", 10)  # Default chunk size
#     pause_duration = data.get("pause_duration", 1)     # Default pause duration

#     if not text:
#         return jsonify({"error": "No text provided"}), 400

#     try:
#         # Break the text into chunks based on the number of words
#         words = text.split()
#         chunks = [words[i:i + words_per_chunk] for i in range(0, len(words), words_per_chunk)]
        
#         # Prepare the audio responses for each chunk
#         audio_urls = []
#         for chunk in chunks:
#             chunk_text = " ".join(chunk)
#             headers = {
#                 "xi-api-key": ELEVENLABS_API_KEY,
#                 "Content-Type": "application/json"
#             }

#             payload = {
#                 "text": chunk_text,
#                 "model_id": "eleven_monolingual_v1",
#                 "voice_settings": {
#                     "stability": 0.5,
#                     "similarity_boost": 0.7,
#                     "style": 0.8,
#                     "use_speaker_boost": True
#                 }
#             }

#             tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
#             response = requests.post(tts_url, headers=headers, json=payload)

#             if response.status_code != 200:
#                 return jsonify({"error": "TTS failed"}), 500

#             # Store the audio file for each chunk
#             with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as f:
#                 f.write(response.content)
#                 f.flush()
#                 audio_urls.append(f.name)

#         return jsonify({"audio_urls": audio_urls, "pause_duration": pause_duration})

#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
    
def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text("text")
    return text if text.strip() else extract_text_from_pdf_images(pdf_path)

def extract_text_from_pdf_images(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        for img in page.get_images(full=True):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image = Image.open(io.BytesIO(base_image["image"]))
            text += pytesseract.image_to_string(image)
    return text

def extract_images_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    base64_images = []
    for page in doc:
        for img in page.get_images(full=True):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            base64_img = base64.b64encode(image_bytes).decode('utf-8')
            base64_images.append(base64_img)
    return base64_images

@app.route('/')
def form():
    return render_template("index.html")

def get_answer_length_prompt(answer_length, marks):
    length_descriptions = {
        "very_short": f"Provide a very brief answer ({marks} marks). Keep it concise and to the point, around {marks * 25} words maximum.",
        "short": f"Provide a short answer ({marks} marks). Be concise but include key points, around {marks * 50} words.",
        "standard": f"Provide a standard answer worth {marks} marks. Include main concepts and explanations, around {marks * 75} words.",
        "detailed": f"Provide a detailed answer worth {marks} marks. Include thorough explanations and examples where relevant, around {marks * 100} words.",
        "comprehensive": f"Provide a comprehensive answer worth {marks} marks. Cover all aspects in depth with detailed explanations, examples, and analysis, around {marks * 150} words."
    }
    
    return length_descriptions.get(answer_length, length_descriptions["standard"])

@app.route('/extract-qna', methods=['POST'])  # Make sure this matches your frontend call
def extract_qna():
    data = request.get_json()  # Expecting JSON data
    generated_answer = data.get("answer", "")

    if not generated_answer:
        return jsonify({"error": "No answer provided."}), 400

    prompt = f"""
    You are a helpful AI assistant. From the following content, extract question with Q written before only and answer, dont make any changes to them.
    I want the given content to be excatly the same but should remove the images and diagrams.

    Ignore any images or image-related content like base64 strings and Diagrams.
    Dont Include Diagrams or images in the output.

    Format the output strictly like this:
    Question: <Rephrased question here>
    Answer: <Cleaned answer here>

    Content:
    {generated_answer}
    """

    try:
        response = model.generate_content(prompt)
        return jsonify({"qna": response.text.strip()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/generate-answer', methods=['POST'])
def generate_answer():
    question_file = request.files['question']
    topic_file = request.files.get('topic')
    answer_length = request.form.get('answerLength', 'standard')
    marks = int(request.form.get('marks', 10))
    
    if not question_file:
        return jsonify({"error": "Question file is required."}), 400
    
    q_path = os.path.join(app.config['UPLOAD_FOLDER'], question_file.filename)
    question_file.save(q_path)
    
    images_base64 = []
    if question_file.filename.endswith('.pdf'):
        question_text = extract_text_from_pdf(q_path)
        images_base64 = extract_images_from_pdf(q_path)
    else:
        with open(q_path, 'r', encoding='utf-8', errors='ignore') as f:
            question_text = f.read()
    
    topic_text = ""
    if topic_file:
        t_path = os.path.join(app.config['UPLOAD_FOLDER'], topic_file.filename)
        topic_file.save(t_path)
        with open(t_path, 'r', encoding='utf-8', errors='ignore') as f:
            topic_text = f.read()
    
    # Get appropriate length instructions
    length_instruction = get_answer_length_prompt(answer_length, marks)
    
    prompt = f"""
    You are an intelligent AI assistant. Answer the following question using topic info if available.
    
    Question:
    {question_text}
    
    Topic Information:
    {topic_text if topic_text else "None provided."}
    
    Instructions for answering:
    {length_instruction}
    
    This is for an academic assignment worth {marks} marks, so make sure your answer is appropriate for that mark allocation.
    Include diagrams, equations, or visual elements in your answer if required by the question.
    Structure your answer clearly with appropriate headings, bullet points, or numbered lists as needed.
    """
    
    try:
        response = model.generate_content(prompt)
        return jsonify({
            "answer": response.text,
            "images": images_base64  # Send diagrams as base64 strings
        })
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True,host='0.0.0')