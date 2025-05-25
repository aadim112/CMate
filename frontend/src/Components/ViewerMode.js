import React, { useState, useEffect } from 'react';
import { database, ref, set } from '../firebase';
import { onValue, get } from 'firebase/database';
import MonacoEditor from '@monaco-editor/react';
import '../styles/ViewerMode.css'

const ViewerMode = ({ contestId, viewerId }) => {
  const [creator, setCreator] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [creatorCode, setCreatorCode] = useState("");
  const [opponentCode, setOpponentCode] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [problemId, setProblemId] = useState("");
  const [problem, setProblem] = useState(null);
  const [theme, setTheme] = useState("vs-dark");
  const [language, setLanguage] = useState("javascript");
  const [loading, setLoading] = useState(true);

  // Fetch contest data and initialize viewer
  useEffect(() => {
    const fetchContestData = async () => {
      try {
        // Get contest details
        const contestRef = ref(database, `contests/${contestId}`);
        const contestSnapshot = await get(contestRef);
        
        if (!contestSnapshot.exists()) {
          console.error("Contest not found");
          setLoading(false);
          return;
        }
        
        const contestData = contestSnapshot.val();
        
        const dbrefcreator =  ref(database, `users/${contestData.createdBy}`);
        const creatorSnapshot = await get(dbrefcreator);
        if (creatorSnapshot.exists()) {
          console.log("User data:", creatorSnapshot.val());
          setCreator(creatorSnapshot.val().name);
        }else{
          console.error("User not found");
        }

        const dbrefopponent =  ref(database, `users/${contestData.opponent}`);
        const opponentSnapshot = await get(dbrefopponent);
        if (opponentSnapshot.exists()) {
          console.log("User data:", opponentSnapshot.val());
          setOpponent(opponentSnapshot.val().name);
        }else{
          console.error("User not found");
        }
        
        // Get problem ID (assuming first problem for simplicity)
        const problemIds = contestData.problems ? Object.keys(contestData.problems) : [];
        if (problemIds.length > 0) {
          const firstProblemId = problemIds[0];
          setProblemId(firstProblemId);
          
          // Fetch problem details
          const problemRef = ref(database, `problemBank/${firstProblemId}`);
          const problemSnapshot = await get(problemRef);
          if (problemSnapshot.exists()) {
            setProblem(problemSnapshot.val());
          }

          // Set up code listeners
          setupCodeListeners(contestId, contestData.createdBy, contestData.opponent, firstProblemId);
        }
        
        // Add user to viewers array if not already there
        if (viewerId && viewerId !== contestData.createdBy && viewerId !== contestData.opponent) {
          const updatedViewers = contestData.viewers ? 
            (contestData.viewers.includes(viewerId) ? contestData.viewers : [...contestData.viewers, viewerId]) 
            : [viewerId];
          
          await set(ref(database, `contests/${contestId}/viewers`), updatedViewers);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching contest data:", error);
        setLoading(false);
      }
    };
    
    fetchContestData();
    
    // Set up listeners for viewer count
    const viewersRef = ref(database, `contests/${contestId}/viewers`);
    const unsubscribeViewers = onValue(viewersRef, (snapshot) => {
      const viewers = snapshot.val() || [];
      setViewerCount(Array.isArray(viewers) ? viewers.length : 0);
    });
    
    return () => {
      unsubscribeViewers();
    };
  }, [contestId, viewerId]);
  
  // Set up code listeners for both users
  const setupCodeListeners = (contestId, creatorId, opponentId, problemId) => {
    if (creatorId) {
      const creatorCodeRef = ref(database, `contests/${contestId}/code/${creatorId}/${problemId}`);
      const unsubscribeCreator = onValue(creatorCodeRef, (snapshot) => {
        if (snapshot.exists()) {
          setCreatorCode(snapshot.val());
        }
      });
    }
    
    if (opponentId) {
      const opponentCodeRef = ref(database, `contests/${contestId}/code/${opponentId}/${problemId}`);
      const unsubscribeOpponent = onValue(opponentCodeRef, (snapshot) => {
        if (snapshot.exists()) {
          setOpponentCode(snapshot.val());
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="viewer-loading">
        <div className="loading-spinner"></div>
        <p>Loading contest data...</p>
      </div>
    );
  }

  if (!creator || !opponent) {
    return (
      <div className="viewer-error">
        <p>Contest information is incomplete. Missing participants.</p>
        <button onClick={() => window.history.back()} className="back-button">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="viewer-container">
      <div className="viewer-header">
        <h1>Live Contest Viewer</h1>
        <div className="viewer-stats">
          <div className="viewer-count">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            <span>{viewerCount} viewing</span>
          </div>
          <button onClick={() => window.history.back()} className="back-button">
            Exit Viewer
          </button>
        </div>
      </div>
      
      {problem && (
        <div className="problem-panel-visitor">
          <h2>{problem.title}</h2>
          <div className="problem-badges">
            <span className={`difficulty-badge ${problem.difficulty}`}>
              {problem.difficulty}
            </span>
            {problem.topic && <span className="topic-badge">{problem.topic}</span>}
          </div>
          <div className="problem-description">
            <p>{problem.description}</p>
          </div>
        </div>
      )}

      <div className="editors-container">
        <div className="editor-panel">
          <div className="editor-header">
            <h3>Player 1 ({creator})</h3>
          </div>
          <div className="monaco-wrapper">
            <MonacoEditor
              height="70vh"
              language={language}
              theme={theme}
              value={creatorCode}
              options={{
                readOnly: true,
                fontSize: 14,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                lineNumbers: 'on',
              }}
            />
          </div>
        </div>

        <div className="editor-panel">
          <div className="editor-header">
            <h3>Player 2 ({opponent})</h3>
          </div>
          <div className="monaco-wrapper">
            <MonacoEditor
              height="70vh"
              language={language}
              theme={theme}
              value={opponentCode}
              options={{
                readOnly: true,
                fontSize: 14,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                lineNumbers: 'on',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewerMode;