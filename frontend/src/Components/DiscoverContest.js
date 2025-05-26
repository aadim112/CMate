import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, push, set } from 'firebase/database';
import { database } from '../firebase';
import { v4 as uuidv4 } from 'uuid';
import '../styles/DiscoverContest.css'; // Import the CSS file
import CodeEditor from './CodeEditor'; // Import the CodeEditor component
import ViewerMode from './ViewerMode'; // Import the ViewerMode component

export default function DiscoverContest({ userUID }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [topics, setTopics] = useState([]);
  const [numQuestions, setNumQuestions] = useState(1);
  const [creating, setCreating] = useState(false);
  const [contests, setContests] = useState([]);
  const [myContests, setMyContests] = useState([]);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [showViewerMode, setShowViewerMode] = useState(false);
  const [editorProps, setEditorProps] = useState({});
  const [viewerProps, setViewerProps] = useState({});


  const db = getDatabase();

  const allTopics = ['arrays', 'graphs', 'trees', 'hashmap', 'string'];

  const toggleTopic = (topic) => {
    setTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  // Check if contest is expired (more than 1 hour after start time)
  const isContestExpired = (startTime) => {
    const now = new Date();
    const contestStartTime = new Date(startTime);
    const oneHourAfterStart = new Date(contestStartTime);
    oneHourAfterStart.setHours(oneHourAfterStart.getHours() + 1);
    
    return now > oneHourAfterStart;
  };

  useEffect(() => {
    const fetchContests = async () => {
      try {
        const contestsRef = ref(db, 'contests');
        const snapshot = await get(contestsRef);
        const data = snapshot.val();
        if (data) {
          const formatted = Object.entries(data).map(([id, contest]) => ({
            id,
            ...contest
          }));
          
          // Filter out expired contests
          const activeContests = formatted.filter(contest => !isContestExpired(contest.startTime));
          setContests(activeContests);
        }
      } catch (error) {
        console.error("Failed to fetch contests:", error);
      }
    };

    fetchContests();
  }, []);

  useEffect(() => {
    const fetchMyContests = async () => {
      try {
        // First get all upcoming contests for the user
        const userContestsRef = ref(db, `user/${userUID}/upcomingContests`);
        const userContestsSnapshot = await get(userContestsRef);
        const userContestsData = userContestsSnapshot.val();
        
        if (!userContestsData) return;
        
        // Then fetch the details of each contest
        const contestDetails = [];
        
        await Promise.all(Object.keys(userContestsData).map(async (contestId) => {
          const contestRef = ref(db, `contests/${contestId}`);
          const contestSnapshot = await get(contestRef);
          const contestData = contestSnapshot.val();
          
          if (contestData) {
            const contest = {
              id: contestId,
              ...contestData
            };
            
            // Only include non-expired contests
            if (!isContestExpired(contest.startTime)) {
              contestDetails.push(contest);
            }
          }
        }));
        
        setMyContests(contestDetails);
      } catch (error) {
        console.error("Failed to fetch user's contests:", error);
      }
    };

    if (userUID) {
      fetchMyContests();
    }
  }, [userUID, db]);

  const handleCreateContest = async () => {
    if (!title || !startTime || topics.length === 0 || numQuestions < 1) {
      alert('Please fill all fields.');
      return;
    }

    setCreating(true);

    try {
      const problemBankRef = ref(db, 'problemBank');
      const snapshot = await get(problemBankRef);
      const allProblems = snapshot.val() || {};

      // Filter by difficulty & topics
      const filtered = Object.entries(allProblems).filter(
        ([, problem]) =>
          problem.difficulty === difficulty &&
          topics.includes(problem.topic)
      );

      if (filtered.length < numQuestions) {
        alert('Not enough problems match your criteria.');
        setCreating(false);
        return;
      }

      // Pick random N
      const shuffled = filtered.sort(() => 0.5 - Math.random());
      const selectedProblems = Object.fromEntries(shuffled.slice(0, numQuestions));

      const contestID = uuidv4();
      const dbrefcreator =  ref(database, `users/${userUID}`);
      const newContest = {
        title,
        createdBy: userUID,
        startTime,
        difficulty,
        topics,
        problems: selectedProblems,
        opponent: null,
        viewers: []
      };

      const contestRef = ref(db, `contests/${contestID}`);
      const contestRefUser = ref(db, `user/${userUID}/upcomingContests/${contestID}`)
      set(contestRefUser, true)
        .then(() => {
            console.log("Contest added to user's upcoming contests.");
            // Refresh my contests list
            const updatedMyContests = [...myContests, { id: contestID, ...newContest }];
            setMyContests(updatedMyContests);
        })
        .catch((error) => {
            console.error("Error adding contest:", error);
        });
      await set(contestRef, newContest);
      alert('Contest created!');
      setShowForm(false);
    } catch (error) {
      console.error(error);
      alert('Error creating contest.');
    }

    setCreating(false);
  };

  const handleJoinContest = async (contestID) => {
    try {
      const contestRef = ref(db, `contests/${contestID}`);
      const snapshot = await get(contestRef);
      const contest = snapshot.val();

      if (!contest) {
        alert("Contest no longer exists.");
        return;
      }

      if (contest.createdBy === userUID || contest.opponent === userUID || contest.viewers?.includes(userUID)) {
        alert("You're already part of this contest.");
        return;
      }

      if (!contest.opponent) {
        // Join as opponent
        await set(ref(db, `contests/${contestID}/opponent`), userUID);
        alert("You joined as an opponent!");
        const contestRef = ref(db, `user/${userUID}/upcomingContests/${contestID}`)
        set(contestRef, true)
          .then(() => {
              console.log("Contest added to user's upcoming contests.");
              // Add to my contests
              const updatedMyContests = [...myContests, { id: contestID, ...contest, opponent: userUID }];
              setMyContests(updatedMyContests);
          })
          .catch((error) => {
              console.error("Error adding contest:", error);
          });

      } else {
        // Join as viewer
        const updatedViewers = contest.viewers ? [...contest.viewers, userUID] : [userUID];
        await set(ref(db, `contests/${contestID}/viewers`), updatedViewers);
        alert("You joined as a viewer.");
        
        // Add to my contests
        const contestRef = ref(db, `user/${userUID}/upcomingContests/${contestID}`)
        set(contestRef, true)
          .then(() => {
              console.log("Contest added to user's upcoming contests as viewer.");
              const updatedMyContests = [...myContests, { 
                id: contestID, 
                ...contest, 
                viewers: updatedViewers 
              }];
              setMyContests(updatedMyContests);
          })
          .catch((error) => {
              console.error("Error adding contest:", error);
          });
      }
    } catch (error) {
      console.error("Error joining contest:", error);
      alert("Failed to join contest.");
    }
  };

  const handleStartContest = (contestId, problemId) => {
    // Set the props for the CodeEditor component
    setEditorProps({
      userId: userUID,
      contestId: contestId,
      problemId: problemId
    });
    
    // Show the CodeEditor component
    setShowCodeEditor(true);
  };

  const handleViewContest = (contestId) => {
    // Set the props for the ViewerMode component
    setViewerProps({
      contestId: contestId,
      viewerId: userUID
    });
    
    // Show the ViewerMode component
    setShowViewerMode(true);
  };

  // Check if contest is within the 1-hour window after start time
  const isContestInWindow = (startTime) => {
    const now = new Date();
    const contestStartTime = new Date(startTime);
    const oneHourAfterStart = new Date(contestStartTime);
    oneHourAfterStart.setHours(oneHourAfterStart.getHours() + 1);
    
    // Return true if current time is between contest start time and 1 hour after
    return now >= contestStartTime && now <= oneHourAfterStart;
  };

  // If the CodeEditor component should be shown, render it
  if (showCodeEditor) {
    return <CodeEditor 
      userId={editorProps.userId} 
      contestId={editorProps.contestId} 
      problemId={editorProps.problemId} 
    />;
  }

  // If the ViewerMode component should be shown, render it
  if (showViewerMode) {
    return <ViewerMode 
      contestId={viewerProps.contestId}
      viewerId={viewerProps.viewerId}
    />;
  }

  return (
    <div className="discover-container">
      <div className="discover-content">
        {/* My Contests Section */}
        <div className="my-contests-section">
          <h2 className="section-title">My Contests</h2>
          <div className="contest-grid">
            {myContests.length === 0 ? (
              <p>You don't have any upcoming contests.</p>
            ) : (
              myContests.map(contest => {
                // Get the first problem ID (or another depending on your needs)
                const problemIds = contest.problems ? Object.keys(contest.problems) : [];
                const firstProblemId = problemIds.length > 0 ? problemIds[0] : null;
                
                // Determine contest status
                const now = new Date();
                const contestStartTime = new Date(contest.startTime);
                const isUpcoming = now < contestStartTime;
                const isActive = isContestInWindow(contest.startTime);
                
                return (
                <div className="contest-card" key={contest.id}>
                  <div className="contest-feature-badge">
                    MY CONTEST
                  </div>
                  <h3 className="contest-title">{contest.title}</h3>
                  <div className="contest-time">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span>{new Date(contest.startTime).toLocaleString()}</span>
                  </div>
                  <div className="topics-container">
                    {contest.topics?.map((topic, index) => (
                      <span className="topic-badge" key={index}>{topic}</span>
                    ))}
                  </div>
                  <div className="card-footer">
                    <div className="difficulty-badge">{contest.difficulty}</div>
                    <div className="button-container">
                      {isActive && firstProblemId && (contest.createdBy === userUID || contest.opponent === userUID) && (
                        <button 
                          className="start-button"
                          onClick={() => handleStartContest(contest.id, firstProblemId)}
                        >
                          Start
                        </button>
                      )}
                      {isActive && contest.opponent && (
                        <button 
                          className="view-button"
                          onClick={() => handleViewContest(contest.id)}
                        >
                          View
                        </button>
                      )}
                      {isUpcoming && (
                        <div className="waiting-badge">Upcoming</div>
                      )}
                    </div>
                  </div>
                </div>
              )})
            )}
          </div>
        </div>

        {/* Discover Contests Section */}
        <div className="discover-header">
          <h2 className="discover-title">Discover Contests</h2>
          <button
            className="create-button"
            onClick={() => setShowForm(true)}
          >
            <svg className="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Contest
          </button>
        </div>

        <div className="contest-grid">
          {contests.length === 0 ? (
            <p>No contests available right now.</p>
          ) : (
            contests.map(contest => {
              const isActive = isContestInWindow(contest.startTime);
              const hasOpponent = !!contest.opponent;

              return (
                <div className="contest-card" key={contest.id}>
                  <div className="contest-feature-badge">
                    {contest.featured ? 'FEATURED' : 'CONTEST'}
                  </div>
                  <h3 className="contest-title">{contest.title}</h3>
                  <div className="contest-time">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span>{new Date(contest.startTime).toLocaleString()}</span>
                  </div>
                  <div className="topics-container">
                    {contest.topics?.map((topic, index) => (
                      <span className="topic-badge" key={index}>{topic}</span>
                    ))}
                  </div>
                  <div className="card-footer">
                    <div className="difficulty-badge">{contest.difficulty}</div>
                    <div className="button-container">
                      {!isActive || userUID === contest.createdBy || userUID === contest.opponent ? (
                        <button className="join-button" disabled={true}>Join</button>
                      ) : (
                        <button className="join-button" onClick={() => handleJoinContest(contest.id)}>Join</button>
                      )}
                      {isActive && hasOpponent && (
                        <button 
                          className="view-button"
                          onClick={() => handleViewContest(contest.id)}
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {showForm && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3 className="modal-title">Create New Contest</h3>
                <button 
                  className="close-button" 
                  onClick={() => setShowForm(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="form-content">
                <div className="form-group">
                  <label className="form-label">Contest Title</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Enter a descriptive title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input
                    className="form-input"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select 
                    value={difficulty} 
                    onChange={(e) => setDifficulty(e.target.value)} 
                    className="form-select"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Topics</label>
                  <div className="topics-selector">
                    {allTopics.map(topic => (
                      <button
                        key={topic}
                        className={`topic-button ${topics.includes(topic) ? 'active' : ''}`}
                        onClick={() => toggleTopic(topic)}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Number of Questions (1-5)</label>
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    max={5}
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                  />
                </div>

                <div className="form-actions">
                  <button
                    className="button-cancel"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="button-create"
                    onClick={handleCreateContest}
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : 'Create Contest'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}