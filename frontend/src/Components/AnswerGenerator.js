import React, { useState, useRef, useEffect,useContext } from "react";
import axios from "axios";
import ReactMarkdown from 'react-markdown';
import '../styles/Assignment.css';
import rehypeRaw from "rehype-raw";
import Mermaid from "./Mermaid";
import { SpeechContext } from "./SpeechContext";
import DictationPlayer from "./DictationPlayer";
import {marked} from 'marked';
function convertMarkdownToText(markdownText) {
  const html = marked(markdownText);  // Convert Markdown to HTML
  const plainText = html.replace(/<[^>]*>/g, '');  // Remove any HTML tags
  return plainText;
}

function AnswerGenerator() {
  const [questionFile, setQuestionFile] = useState(null);
  const [topicFile, setTopicFile] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [dragActive, setDragActive] = useState({ question: false, topic: false });
  const [previews, setPreviews] = useState({ question: null, topic: null });
  const [answerLength, setAnswerLength] = useState("standard");
  const [marks, setMarks] = useState(10);
  const currentDate = new Date().toLocaleDateString(); 
  const { setSpeechText } = useContext(SpeechContext);
  const [qna, setQna] = useState("");

  const [isClient, setIsClient] = useState(false);

useEffect(() => {
  setIsClient(true);
}, []);


  useEffect(() => {
  if (answer) {
    setSpeechText(answer);
  }
}, [answer, setSpeechText]);


  
  const questionInputRef = useRef(null);
  const topicInputRef = useRef(null);

const renderers = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    if (match?.[1] === "mermaid") {
      return isClient ? <Mermaid chart={String(children)} /> : <div>Loading diagram...</div>;
    }
    return <code className={className} {...props}>{children}</code>;
  },
};

const stripImages = (htmlString) => {
  return htmlString.replace(/<img[^>]*alt="([^"]*)"[^>]*>/g, '');  // Remove images entirely
};


  useEffect(() => {
    // Clean up object URLs when component unmounts
    return () => {
      if (previews.question) URL.revokeObjectURL(previews.question);
      if (previews.topic) URL.revokeObjectURL(previews.topic);
    };
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDrag = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive({ ...dragActive, [type]: true });
    } else if (e.type === "dragleave") {
      setDragActive({ ...dragActive, [type]: false });
    }
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive({ ...dragActive, [type]: false });
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files[0], type);
      e.dataTransfer.clearData();
    }
  };

  const isImageFile = (file) => {
    return file && file.type.startsWith('image/');
  };

  const isPdfFile = (file) => {
    return file && file.type === 'application/pdf';
  };

  const handleFiles = (file, type) => {
    if (type === "question") {
      setQuestionFile(file);
      
      // Revoke previous preview URL if exists
      if (previews.question) {
        URL.revokeObjectURL(previews.question);
      }
      
      // Generate preview if it's an image
      if (isImageFile(file)) {
        const previewUrl = URL.createObjectURL(file);
        setPreviews(prev => ({ ...prev, question: previewUrl }));
      } else {
        setPreviews(prev => ({ ...prev, question: null }));
      }
    } else {
      setTopicFile(file);
      
      // Revoke previous preview URL if exists
      if (previews.topic) {
        URL.revokeObjectURL(previews.topic);
      }
      
      // Generate preview if it's an image
      if (isImageFile(file)) {
        const previewUrl = URL.createObjectURL(file);
        setPreviews(prev => ({ ...prev, topic: previewUrl }));
      } else {
        setPreviews(prev => ({ ...prev, topic: null }));
      }
    }
  };

  const handleChange = (e, type) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files[0], type);
    }
  };

  const handleRemoveFile = (type) => {
    if (type === "question") {
      setQuestionFile(null);
      if (previews.question) {
        URL.revokeObjectURL(previews.question);
        setPreviews(prev => ({ ...prev, question: null }));
      }
      if (questionInputRef.current) {
        questionInputRef.current.value = "";
      }
    } else {
      setTopicFile(null);
      if (previews.topic) {
        URL.revokeObjectURL(previews.topic);
        setPreviews(prev => ({ ...prev, topic: null }));
      }
      if (topicInputRef.current) {
        topicInputRef.current.value = "";
      }
    }
  };

  const handleButtonClick = (type) => {
    if (type === "question" && questionInputRef.current) {
      questionInputRef.current.click();
    } else if (type === "topic" && topicInputRef.current) {
      topicInputRef.current.click();
    }
  };

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Add this state near your other states
const [extractionState, setExtractionState] = useState({
  loading: false,
  error: null,
  qna: ""
});

const handleExtractanswer = async (answerText) => {
  if (!answerText?.trim()) {
    setExtractionState(prev => ({
      ...prev,
      error: "No answer text provided for extraction"
    }));
    return;
  }

  try {
    setExtractionState(prev => ({ ...prev, loading: true, error: null }));
    
    const res = await axios.post(`${API_BASE_URL}/extract-qna`, {
      answer: answerText  // Send as JSON with "answer" field
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'  // Important header
      }
    });

    if (!res.data?.qna) {
      throw new Error("Invalid response format from server");
    }

    setExtractionState(prev => ({
      ...prev,
      loading: false,
      qna: res.data.qna
    }));
    console.log("Extracted Q&A:", res.data.qna);
  } catch (err) {
    const errorMessage = err.response?.data?.error || 
                        err.message || 
                        "Failed to extract Q&A";
    
    setExtractionState(prev => ({
      ...prev,
      loading: false,
      error: errorMessage
    }));
    
    console.error("Extraction error:", err);
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validation
  if (!questionFile) {
    alert("Question file is required!");
    return;
  }

  if (marks < 1 || marks > 100) {
    alert("Marks must be between 1 and 100");
    return;
  }

  const formData = new FormData();
  formData.append("question", questionFile);
  if (topicFile) formData.append("topic", topicFile);
  formData.append("answerLength", answerLength);
  formData.append("marks", marks.toString()); // Ensure string value

  try {
    setLoading(true);
    setAnswer("");
    setImages([]);
    setExtractionState(prev => ({ ...prev, qna: "" }));

    const controller = new AbortController();
    const signal = controller.signal;

    const res = await axios.post(`${API_BASE_URL}/generate-answer`, formData, {
      signal,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000 // 60 seconds timeout
    });

    if (!res.data?.answer) {
      throw new Error("No answer returned from server");
    }

    setAnswer(res.data.answer);
    setImages(res.data.images || []);
    
    // Extract Q&A in parallel (no need to wait)
    handleExtractanswer(res.data.answer);
  } catch (err) {
    if (axios.isCancel(err)) {
      console.log("Request canceled:", err.message);
    } else {
      const errorMessage = err.response?.data?.error || 
                         err.message || 
                         "Failed to generate answer";
      
      setAnswer(`Error: ${errorMessage}`);
      setImages([]);
      console.error("Generation error:", err);
    }
  } finally {
    setLoading(false);
  }
};

  const getFileIcon = (file) => {
    if (!file) return '📄';
    
    if (isImageFile(file)) {
      return '🖼️';
    } else if (isPdfFile(file)) {
      return '📑';
    } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      return '📝';
    } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
      return '📊';
    } else if (file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) {
      return '📽️';
    } else if (file.name.endsWith('.txt')) {
      return '📄';
    }
    
    return '📁';
  };

  const renderFilePreview = (type) => {
    const file = type === "question" ? questionFile : topicFile;
    const preview = type === "question" ? previews.question : previews.topic;
    
    if (!file) return null;
    
    if (isImageFile(file) && preview) {
      return (
        <div className="file-preview-container">
          <img src={preview} alt={file.name} className="file-preview-image" />
          <div className="file-preview-name">{file.name}</div>
          <div className="file-preview-controls">
            <span 
              className="remove-file"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile(type);
              }}
            >
              ✕
            </span>
          </div>
        </div>
      );
    }
    
    return (
      <div className="file-info">
        <span className="file-icon">{getFileIcon(file)}</span>
        <span className="file-name">{file.name}</span>
        <span className="file-size">{formatFileSize(file.size)}</span>
        <span 
          className="remove-file"
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveFile(type);
          }}
        >
          ✕
        </span>
      </div>
    );
  };

  return (
    <div className="assignment-container">
      <h2>Assignment Answer Generator</h2>
      <form onSubmit={handleSubmit}>
        <div className="file-upload-area">
          {/* Question File Upload */}
          <div className="file-input-group">
            <label className="required-label">Question File</label>
            <div 
              className={`file-drop-zone ${dragActive.question ? 'highlight' : ''} ${questionFile ? 'has-file' : ''}`}
              onDragEnter={(e) => handleDrag(e, "question")}
              onDragOver={(e) => handleDrag(e, "question")}
              onDragLeave={(e) => handleDrag(e, "question")}
              onDrop={(e) => handleDrop(e, "question")}
              onClick={() => handleButtonClick("question")}
            >
              <input
                ref={questionInputRef}
                type="file"
                onChange={(e) => handleChange(e, "question")}
                required
              />
              
              {!questionFile ? (
                <>
                  <div className="file-icon">📄</div>
                  <div className="file-drop-text">Drag & Drop your assignment file here</div>
                  <div className="file-drop-hint">or</div>
                  <button type="button" className="browse-btn">Browse Files</button>
                </>
              ) : (
                renderFilePreview("question")
              )}
            </div>
          </div>

          {/* Topic File Upload */}
          <div className="file-input-group">
            <label>Topic Info File (optional)</label>
            <div 
              className={`file-drop-zone ${dragActive.topic ? 'highlight' : ''} ${topicFile ? 'has-file' : ''}`}
              onDragEnter={(e) => handleDrag(e, "topic")}
              onDragOver={(e) => handleDrag(e, "topic")}
              onDragLeave={(e) => handleDrag(e, "topic")}
              onDrop={(e) => handleDrop(e, "topic")}
              onClick={() => handleButtonClick("topic")}
            >
              <input
                ref={topicInputRef}
                type="file"
                onChange={(e) => handleChange(e, "topic")}
              />
              
              {!topicFile ? (
                <>
                  <div className="file-icon">📚</div>
                  <div className="file-drop-text">Drag & Drop your supporting material</div>
                  <div className="file-drop-hint">or</div>
                  <button type="button" className="browse-btn">Browse Files</button>
                </>
              ) : (
                renderFilePreview("topic")
              )}
            </div>
          </div>
        </div>

        {/* Answer Length Options and Marks Input */}
        <div className="answer-options">
          <div className="option-group">
            <label>Answer Length</label>
            <div className="radio-group">
              <label className="radio-label">
                <input 
                  type="radio" 
                  name="answerLength" 
                  value="very_short" 
                  checked={answerLength === "very_short"}
                  onChange={() => setAnswerLength("very_short")}
                />
                Very Short
              </label>
              <label className="radio-label">
                <input 
                  type="radio" 
                  name="answerLength" 
                  value="short" 
                  checked={answerLength === "short"}
                  onChange={() => setAnswerLength("short")}
                />
                Short
              </label>
              <label className="radio-label">
                <input 
                  type="radio" 
                  name="answerLength" 
                  value="standard" 
                  checked={answerLength === "standard"}
                  onChange={() => setAnswerLength("standard")}
                />
                Standard
              </label>
              <label className="radio-label">
                <input 
                  type="radio" 
                  name="answerLength" 
                  value="detailed" 
                  checked={answerLength === "detailed"}
                  onChange={() => setAnswerLength("detailed")}
                />
                Detailed
              </label>
              <label className="radio-label">
                <input 
                  type="radio" 
                  name="answerLength" 
                  value="comprehensive" 
                  checked={answerLength === "comprehensive"}
                  onChange={() => setAnswerLength("comprehensive")}
                />
                Comprehensive
              </label>
            </div>
          </div>
          
          <div className="option-group">
            <label htmlFor="marks">Maximum Marks</label>
            <input
              type="number"
              id="marks"
              min="1"
              max="100"
              value={marks}
              onChange={(e) => setMarks(parseInt(e.target.value) || 10)}
              className="marks-input"
            />
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Generating Answer...
            </>
          ) : (
            "Generate Answer"
          )}
        </button>
      </form>

      {answer && (
        <div className="answer-section">
          <div className="notebook-paper">
            <p style={{ margin: '0px', marginTop: '50px', fontFamily: 'cursive' }}>
              Date: {currentDate}
            </p>
            <div style={{ marginTop: '2px', borderBottom: 'solid 1.5px black' }}></div>
            <div style={{ marginTop: '2px', borderBottom: 'solid 1.5px black' }}></div>
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>

          {images.length > 0 && (
            <div className="images-section">
              <h3>Extracted Diagrams</h3>
              <div className="diagram-gallery">
                {images.map((img, idx) => (
                  <div className="diagram-container" key={idx}>
                    <img
                      className="diagram-image"
                      src={`data:image/png;base64,${img}`}
                      alt={`Diagram ${idx + 1}`}
                    />
                    <div className="diagram-caption">Diagram {idx + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* This should be INSIDE the `answer &&` block */}
          <DictationPlayer text={convertMarkdownToText(extractionState.qna)} />
          </div>
        )}
    </div>
  );
}

export default AnswerGenerator;