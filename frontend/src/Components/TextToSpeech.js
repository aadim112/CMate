import React, { useState, useEffect, useRef, useContext } from "react";
import { SpeechContext } from "./SpeechContext";

const TextToSpeech = () => {
  const { speechText, wordsPerChunk, setWordsPerChunk } = useContext(SpeechContext);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const utteranceRef = useRef(null);
  const [baseDelay, setBaseDelay] = useState(1000); // default 1s
  const [charDelay, setCharDelay] = useState(40); // default 40ms/char
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const dragRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  const stripMarkdown = (text) => {
    return text
      .replace(/[_*#~\-\\]/g, "") // remove markdown symbols
      .replace(/\[(.*?)\]\(.*?\)/g, "$1") // convert [text](link) to text
      .replace(/!\[(.*?)\]\(.*?\)/g, "") // remove images
      .replace(/^\s*>/gm, "") // remove blockquotes
      .replace(/^\s*\d+\.\s+/gm, "") // remove numbered list formatting
      .replace(/^\s*[-*+]\s+/gm, "") // remove bullet points
      .replace(/#+\s/g, ""); // remove headings
  };

  const cleanText = stripMarkdown(speechText);
  const words = cleanText.trim().split(/\s+/);
  const sentenceChunks = cleanText.match(/[^\.!\?]+[\.!\?]+/g) || [cleanText];
  const chunks = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
  chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
}

  const estimatePauseDuration = (chunk) => {
    const sentenceEndings = (chunk.match(/[\.!?]/g) || []).length;
    return baseDelay + chunk.length * charDelay + sentenceEndings * 300;
  };

  const speakChunk = (index) => {
    if (index >= chunks.length || isPaused) {
      setIsSpeaking(false);
      return;
    }

    const chunk = chunks[index];
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.voice = availableVoices.find((v) => v.voiceURI === selectedVoiceURI);
    utteranceRef.current = utterance;
    setCurrentChunkIndex(index);

    utterance.onend = () => {
      if (!isPaused && currentChunkIndex < chunks.length - 1) {
        const pause = estimatePauseDuration(chunk);
        setTimeout(() => {
          speakChunk(currentChunkIndex + 1);
        }, pause);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const startSpeaking = () => {
    if (!speechText.trim()) return;
    setIsSpeaking(true);
    setIsPaused(false);
    setCurrentChunkIndex(0);
    speakChunk(0);
  };

  const pauseSpeaking = () => {
    setIsPaused(true);
    setIsSpeaking(false);
    window.speechSynthesis.pause();
  };

  const resumeSpeaking = () => {
  if (!isPaused) return;
  setIsPaused(false);
  setIsSpeaking(true);
  window.speechSynthesis.resume(); // resume current speech
};


  const revertChunk = () => {
    if (currentChunkIndex > 0) {
      setCurrentChunkIndex(currentChunkIndex - 1);
      setIsSpeaking(false);
      setIsPaused(false);
      window.speechSynthesis.cancel(); // Cancel current speech
      speakChunk(currentChunkIndex - 1); // Restart previous chunk
    }
  };

useEffect(() => {
  const interval = setInterval(() => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      setAvailableVoices(voices);
      if (!selectedVoiceURI) {
        setSelectedVoiceURI(voices[0].voiceURI);
      }
      clearInterval(interval);
    }
  }, 200);

  return () => clearInterval(interval);
}, []);


  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Dragging functionality
  const handleMouseDown = (e) => {
    if (dragRef.current && e.target === dragRef.current) {
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      offsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - offsetRef.current.x,
        y: e.clientY - offsetRef.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const styles = {
    container: {
      position: 'fixed',
      top: `${position.y}px`,
      left: `${position.x}px`,
      width: isCollapsed ? '48px' : '360px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      transition: 'width 0.3s ease',
      overflow: 'hidden',
      zIndex: 1000,
      fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      fontSize: '14px',
      color: '#333',
    },
    header: {
      padding: '10px 12px',
      backgroundColor: '#4a6fa5',
      color: '#fff',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'move',
      borderTopLeftRadius: '8px',
      borderTopRightRadius: '8px',
      userSelect: 'none',
    },
    title: {
      margin: 0,
      fontSize: '16px',
      fontWeight: 600,
    },
    headerButtons: {
      display: 'flex',
      gap: '6px',
    },
    iconButton: {
      background: 'transparent',
      border: 'none',
      color: '#fff',
      cursor: 'pointer',
      padding: '2px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '24px',
      height: '24px',
      borderRadius: '4px',
      fontSize: '14px',
    },
    body: {
      padding: isCollapsed ? '0' : '12px 16px',
      display: isCollapsed ? 'none' : 'block',
    },
    formGroup: {
      marginBottom: '12px',
    },
    label: {
      display: 'block',
      marginBottom: '6px',
      fontWeight: 500,
    },
    input: {
      padding: '8px 10px',
      border: '1px solid #d0d5dd',
      borderRadius: '4px',
      fontSize: '14px',
      width: '100%',
      boxSizing: 'border-box',
    },
    flexContainer: {
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-start',
    },
    inputSmall: {
      width: '80px',
    },
    select: {
      padding: '8px 10px',
      border: '1px solid #d0d5dd',
      borderRadius: '4px',
      fontSize: '14px',
      width: '100%',
      backgroundColor: '#fff',
    },
    button: {
      padding: '8px 12px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 500,
      transition: 'background-color 0.2s ease',
      fontSize: '14px',
    },
    primaryButton: {
      backgroundColor: '#4a6fa5',
      color: '#fff',
    },
    secondaryButton: {
      backgroundColor: '#e9ecef',
      color: '#495057',
    },
    progressContainer: {
      marginTop: '12px',
      padding: '10px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
      border: '1px solid #e9ecef',
    },
    progressText: {
      marginBottom: '8px',
    },
    speakingText: {
      backgroundColor: '#edf2f7',
      padding: '10px',
      borderRadius: '4px',
      marginTop: '6px',
      display: 'block',
      fontSize: '14px',
      lineHeight: '1.5',
      maxHeight: '100px',
      overflowY: 'auto',
    },
    buttonGroup: {
      display: 'flex',
      gap: '8px',
      marginBottom: '10px',
    },
  };

  return (
    <div style={styles.container}>
      <div 
        ref={dragRef}
        style={styles.header}
        onMouseDown={handleMouseDown}
      >
        <h3 style={styles.title}>{isCollapsed ? 'TTS' : 'Dictation Controls'}</h3>
        <div style={styles.headerButtons}>
          <button 
            style={styles.iconButton} 
            onClick={toggleCollapse}
          >
            {isCollapsed ? '↔' : '↕'}
          </button>
        </div>
      </div>

      <div style={styles.body}>
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Words per chunk:
          </label>
          <input
            style={styles.input}
            type="number"
            min="1"
            max="100"
            value={wordsPerChunk}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val)) setWordsPerChunk(val);
            }}
          />
        </div>

        <div style={styles.formGroup}>
          <div style={styles.flexContainer}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Base Delay (ms):</label>
              <input
                type="number"
                value={baseDelay}
                onChange={(e) => setBaseDelay(Number(e.target.value))}
                style={{...styles.input, ...styles.inputSmall}}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Char Delay (ms):</label>
              <input
                type="number"
                value={charDelay}
                onChange={(e) => setCharDelay(Number(e.target.value))}
                style={{...styles.input, ...styles.inputSmall}}
              />
            </div>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Voice / Accent:</label>
          <select
            value={selectedVoiceURI || ""}
            onChange={(e) => setSelectedVoiceURI(e.target.value)}
            style={styles.select}
          >
            {availableVoices.map((voice, idx) => (
              <option key={idx} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>

        <div style={styles.buttonGroup}>
          {!isSpeaking && !isPaused && (
            <button 
              onClick={startSpeaking} 
              style={{...styles.button, ...styles.primaryButton}}
            >
              Start Dictation
            </button>
          )}
          {isSpeaking && (
            <button 
              onClick={pauseSpeaking} 
              style={{...styles.button, ...styles.secondaryButton}}
            >
              Pause
            </button>
          )}
          {isPaused && (
            <button 
              onClick={resumeSpeaking} 
              style={{...styles.button, ...styles.primaryButton}}
            >
              Resume
            </button>
          )}
          <button 
            onClick={revertChunk} 
            disabled={currentChunkIndex === 0}
            style={{
              ...styles.button, 
              ...styles.secondaryButton,
              opacity: currentChunkIndex === 0 ? 0.5 : 1,
              cursor: currentChunkIndex === 0 ? 'default' : 'pointer',
            }}
          >
            🔁 Revert
          </button>
        </div>

        {speechText.trim() && chunks.length > 0 && (
          <div style={styles.progressContainer}>
            <div style={styles.progressText}>
              <strong>Progress:</strong> Chunk {Math.min(currentChunkIndex + 1, chunks.length)} of {chunks.length}
            </div>
            <div>
              <strong>Speaking:</strong>
              <span style={styles.speakingText}>
                {chunks[currentChunkIndex] || "Completed"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextToSpeech;