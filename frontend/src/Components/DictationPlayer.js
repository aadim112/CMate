import React, { useEffect, useRef, useState } from 'react';

function DictationPlayer({ text }) {
  const [chunkSize, setChunkSize] = useState(20);
  const [pauseDuration, setPauseDuration] = useState(1000);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [voices, setVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 'right', y: 'bottom' });
  
  const utteranceRef = useRef(null);
  const chunksRef = useRef([]);
  const currentChunkIndexRef = useRef(0);
  const isStoppedRef = useRef(false);

  useEffect(() => {
    const loadVoices = () => {
      const loadedVoices = speechSynthesis.getVoices();
      setVoices(loadedVoices);
      if (loadedVoices.length > 0) {
        setSelectedVoiceURI(loadedVoices[0].voiceURI);
      }
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  const splitTextIntoChunks = (text, size) => {
    const words = text.trim().split(/\s+/);
    const chunks = [];

    for (let i = 0; i < words.length; i += size) {
      chunks.push(words.slice(i, i + size).join(' '));
    }

    return chunks;
  };

  const speakChunks = async () => {
    if (!text) return;

    setIsSpeaking(true);
    setIsPaused(false);
    setProgress(0);
    isStoppedRef.current = false;

    chunksRef.current = splitTextIntoChunks(text, chunkSize);
    currentChunkIndexRef.current = 0;

    while (
      currentChunkIndexRef.current < chunksRef.current.length &&
      !isStoppedRef.current
    ) {
      if (isPaused) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      const chunk = chunksRef.current[currentChunkIndexRef.current];
      const utterance = new SpeechSynthesisUtterance(chunk);

      const selectedVoice = voices.find((v) => v.voiceURI === selectedVoiceURI);
      if (selectedVoice) utterance.voice = selectedVoice;

      utteranceRef.current = utterance;

      speechSynthesis.speak(utterance);

      await new Promise((resolve) => {
        utterance.onend = () => {
          // Smart pause: base + chunk length factor
          const smartPause = pauseDuration + chunk.length * 10;
          setTimeout(resolve, smartPause);
        };
      });

      currentChunkIndexRef.current++;
      setProgress(currentChunkIndexRef.current);
    }

    setIsSpeaking(false);
    utteranceRef.current = null;
  };

  const handleRevert = () => {
    if (currentChunkIndexRef.current > 1) {
      currentChunkIndexRef.current -= 2;
      setProgress(currentChunkIndexRef.current + 1);
    } else {
      currentChunkIndexRef.current = 0;
      setProgress(1);
    }
    speechSynthesis.cancel();
    setTimeout(() => speakChunks(), 300);
  };
  
  const handlePause = () => {
    setIsPaused(true);
    speechSynthesis.pause();
  };

  const handleResume = () => {
    setIsPaused(false);
    speechSynthesis.resume();
  };

  const handleStop = () => {
    setIsSpeaking(false);
    setIsPaused(false);
    setProgress(0);
    isStoppedRef.current = true;
    speechSynthesis.cancel();
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const changePosition = (x, y) => {
    setPosition({ x, y });
  };

  // Draggable functionality
  const dictationBoxRef = useRef(null);
  useEffect(() => {
    const el = dictationBoxRef.current;
    let isDragging = false;
    let offset = { x: 0, y: 0 };

    const onMouseDown = (e) => {
      if (e.target.classList.contains('header') || e.target.closest('.header')) {
        isDragging = true;
        offset.x = e.clientX - el.getBoundingClientRect().left;
        offset.y = e.clientY - el.getBoundingClientRect().top;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      }
    };

    const onMouseMove = (e) => {
      if (isDragging) {
        el.style.left = `${e.clientX - offset.x}px`;
        el.style.top = `${e.clientY - offset.y}px`;
        // Remove snap position once manually moved
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.classList.remove('snapped-bottom-right', 'snapped-bottom-left', 'snapped-top-right', 'snapped-top-left');
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    el.addEventListener('mousedown', onMouseDown);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  // Get position class based on current position setting
  const getPositionClass = () => {
    return `snapped-${position.y}-${position.x}`;
  };

  return (
    <div
      ref={dictationBoxRef}
      className={`dictation-player ${getPositionClass()} ${isCollapsed ? 'collapsed' : ''}`}
    >
      <div className="header">
        <h4>🔊 Dictation</h4>
        <div className="controls">
          <button className="position-btn" onClick={() => changePosition('left', 'top')}>↖️</button>
          <button className="position-btn" onClick={() => changePosition('right', 'top')}>↗️</button>
          <button className="position-btn" onClick={() => changePosition('left', 'bottom')}>↙️</button>
          <button className="position-btn" onClick={() => changePosition('right', 'bottom')}>↘️</button>
          <button className="collapse-btn" onClick={toggleCollapse}>
            {isCollapsed ? '🔽' : '🔼'}
          </button>
        </div>
      </div>
      
      <div className="content">
        <div className="settings-group">
          <label>
            <span>🧮 Words per chunk:</span>
            <input
              type="number"
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
            />
          </label>
        </div>
        
        <div className="settings-group">
          <label>
            <span>⏱ Pause (ms):</span>
            <input
              type="number"
              value={pauseDuration}
              onChange={(e) => setPauseDuration(Number(e.target.value))}
            />
          </label>
        </div>
        
        <div className="settings-group">
          <label>
            <span>🗣 Voice:</span>
            <select
              value={selectedVoiceURI || ''}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
            >
              {voices.map((voice, idx) => (
                <option key={idx} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </label>
        </div>
        
        <div className="button-group">
          {!isSpeaking && (
            <button className="action-btn play-btn" onClick={speakChunks}>▶️ Start</button>
          )}
          {isSpeaking && !isPaused && (
            <button className="action-btn pause-btn" onClick={handlePause}>⏸ Pause</button>
          )}
          {isSpeaking && isPaused && (
            <button className="action-btn resume-btn" onClick={handleResume}>▶️ Resume</button>
          )}
          {isSpeaking && (
            <button className="action-btn stop-btn" onClick={handleStop}>⏹ Stop</button>
          )}
          {isSpeaking && !isPaused && (
            <button className="action-btn revert-btn" onClick={handleRevert}>⏪ Revert</button>
          )}
        </div>
        
        <div className="progress-container">
          <div className="progress-text">
            📊 Progress: {progress} / {chunksRef.current.length || 0}
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar" 
              style={{
                width: chunksRef.current.length ? `${(progress / chunksRef.current.length) * 100}%` : '0%'
              }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        .dictation-player {
          position: fixed;
          width: 320px;
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
          z-index: 9999;
          transition: all 0.3s ease;
          border: 1px solid rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        /* Snap positioning classes */
        .snapped-bottom-right {
          bottom: 24px;
          right: 24px;
          left: auto;
          top: auto;
        }
        
        .snapped-bottom-left {
          bottom: 24px;
          left: 24px;
          right: auto;
          top: auto;
        }
        
        .snapped-top-right {
          top: 24px;
          right: 24px;
          left: auto;
          bottom: auto;
        }
        
        .snapped-top-left {
          top: 24px;
          left: 24px;
          right: auto;
          bottom: auto;
        }
        
        .header {
          background: linear-gradient(135deg, #4776E6, #8E54E9);
          color: white;
          padding: 12px 16px;
          border-radius: 10px 10px 0 0;
          cursor: move;
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
        }
        
        .header h4 {
          margin: 0;
          font-weight: 600;
          font-size: 16px;
        }
        
        .controls {
          display: flex;
          gap: 4px;
        }
        
        .position-btn, .collapse-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          padding: 2px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .position-btn:hover, .collapse-btn:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
        
        .content {
          padding: 16px;
          max-height: 400px;
          overflow-y: auto;
          transition: max-height 0.3s ease;
        }
        
        .collapsed .content {
          max-height: 0;
          padding: 0 16px;
          overflow: hidden;
        }
        
        .settings-group {
          margin-bottom: 12px;
        }
        
        label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }
        
        input, select {
          width: 120px;
          padding: 6px 8px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        
        input:focus, select:focus {
          border-color: #8E54E9;
          box-shadow: 0 0 0 2px rgba(142, 84, 233, 0.2);
        }
        
        .button-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .action-btn {
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s;
          flex: 1;
          min-width: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .play-btn, .resume-btn {
          background-color: #4CAF50;
          color: white;
        }
        
        .pause-btn {
          background-color: #FF9800;
          color: white;
        }
        
        .stop-btn {
          background-color: #F44336;
          color: white;
        }
        
        .revert-btn {
          background-color: #2196F3;
          color: white;
        }
        
        .action-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        
        .action-btn:active {
          transform: translateY(0);
        }
        
        .progress-container {
          margin-top: 12px;
        }
        
        .progress-text {
          font-size: 14px;
          margin-bottom: 6px;
          color: #555;
        }
        
        .progress-bar-container {
          height: 8px;
          background-color: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #4776E6, #8E54E9);
          border-radius: 4px;
          transition: width 0.3s ease;
        }
      `}</style>
    </div>
  );
}

export default DictationPlayer;