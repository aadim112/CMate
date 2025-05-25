import React, { useState, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { database, ref } from '../firebase';
import { get ,set} from 'firebase/database';
import { onValue } from 'firebase/database';
import '../styles/CodeEditor.css'
import axios from 'axios';

const CodeEditor = ({ userId, contestId, problemId }) => {
  // State for editor
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [theme, setTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  
  // State for problem details
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState(null);
  const [runningCode, setRunningCode] = useState(false);
  const [submittingCode, setSubmittingCode] = useState(false);
  const [activeTab, setActiveTab] = useState('description');

  const JUDGE0_API = 'https://judge0-ce.p.rapidapi.com/submissions';
  const API_KEY = '3012d9b222msh7a6ba887e76c48dp1be2c2jsn52306c16f187'; // Optional if using RapidAPI

  const LANGUAGE_ID_MAP = {
    cpp: 54,
    java: 62,
    python: 71,
    javascript: 63,
  };
  const submitToJudge0 = async ({ code, languageId, input }) => {
  const submissionData = {
    source_code: code,
    language_id: languageId,
    stdin: input,
  };

  const options = {
    method: 'POST',
    url: JUDGE0_API + '?base64_encoded=false&wait=true',
    headers: {
      'content-type': 'application/json',
      'X-RapidAPI-Key': API_KEY,
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
    },
    data: submissionData,
  };

  try {
    const response = await axios.request(options);
    return response.data;
  } catch (err) {
    console.error('Judge0 Error:', err.response?.data || err.message);
    throw err;
  }
};

  
  // Language default code templates
  const LANGUAGE_OPTIONS = [
    { 
      label: "JavaScript", 
      value: "javascript", 
      defaultCode: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Your code here
};`
    },
    { 
      label: "Python", 
      value: "python", 
      defaultCode: `class Solution:
    def twoSum(self, nums, target):
        """
        :type nums: List[int]
        :type target: int
        :rtype: List[int]
        """
        # Your code here
        pass`
    },
    { 
      label: "Java", 
      value: "java", 
      defaultCode: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your code here
        return new int[]{0, 0};
    }
}`
    },
    { 
      label: "C++", 
      value: "cpp", 
      defaultCode: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Your code here
        return {0, 0};
    }
};`
    }
  ];

  useEffect(() => {
    // Fetch problem details
    const fetchProblem = async () => {
      try {
        const problemRef = ref(database, `contests/${contestId}/problems/${problemId}`);
        const snapshot = await get(problemRef);
        
        if (snapshot.exists()) {
          setProblem(snapshot.val());
        } else {
          // Fallback to problem bank if not found in contest
          const bankRef = ref(database, `problemBank/${problemId}`);
          const bankSnapshot = await get(bankRef);
          
          if (bankSnapshot.exists()) {
            setProblem(bankSnapshot.val());
          } else {
            console.error("Problem not found");
          }
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching problem:", error);
        setLoading(false);
      }
    };

    fetchProblem();
  }, [contestId, problemId]);

  useEffect(() => {
    // Sync the user's code from Firebase
    const codeRef = ref(database, `contests/${contestId}/code/${userId}/${problemId}`);
    const unsubscribe = onValue(codeRef, snapshot => {
      if (snapshot.exists()) {
        setCode(snapshot.val());
      } else {
        // Set default code template based on selected language
        const defaultTemplate = LANGUAGE_OPTIONS.find(lang => lang.value === language);
        setCode(defaultTemplate ? defaultTemplate.defaultCode : "");
      }
    });

    return () => unsubscribe();
  }, [contestId, userId, problemId, language]);

  const handleCodeChange = (newCode) => {
    // Update Firebase in real-time as the user types
    const codeRef = ref(database, `contests/${contestId}/code/${userId}/${problemId}`);
    set(codeRef, newCode);
    setCode(newCode);  // Local state to update the editor
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    
    // Set default code template for the selected language
    const langTemplate = LANGUAGE_OPTIONS.find(lang => lang.value === newLang);
    if (langTemplate) {
      // Check if user already has code saved for this problem in this language
      const codeRef = ref(database, `contests/${contestId}/code/${userId}/${problemId}`);
      get(codeRef).then(snapshot => {
        if (!snapshot.exists() || code === "") {
          // If no code is saved yet, use the template
          handleCodeChange(langTemplate.defaultCode);
        }
      });
    }
  };

  const handleThemeChange = (e) => {
    setTheme(e.target.value);
  };

  const handleFontSizeChange = (e) => {
    setFontSize(parseInt(e.target.value));
  };

const runCode = async () => {
  setRunningCode(true);
  try {
    const testCases = problem?.testCases || [];
    const results = [];

    for (let test of testCases) {
      // Build the test input as a string — customize this per problem
      let stdin = '';

      if (Array.isArray(test.input)) {
        stdin = JSON.stringify(test.input);
        if (test.target !== undefined) {
          stdin += '\n' + test.target;
        }
      } else if (typeof test.input === 'object') {
        stdin = Object.entries(test.input)
          .map(([key, val]) => `${key} = ${JSON.stringify(val)}`)
          .join('\n');
      } else {
        stdin = String(test.input);
      }

      const judgeResult = await submitToJudge0({
        code,
        languageId: LANGUAGE_ID_MAP[language],
        input: stdin,
      });

      results.push({
        input: stdin,
        expected: JSON.stringify(test.expectedOutput),
        output: (judgeResult.stdout?.trim() || judgeResult.stderr || judgeResult.compile_output || 'No Output').trim(),
        passed: (judgeResult.stdout?.trim() || '') === JSON.stringify(test.expectedOutput).trim(),
      });
    }

    const passedCount = results.filter(r => r.passed).length;

    setTestResults({
      status: passedCount === results.length ? 'Success' : 'Failed',
      message: `${passedCount}/${results.length} test cases passed.`,
      results,
    });
  } catch (err) {
    setTestResults({
      status: 'Error',
      message: 'Code execution failed. Please try again.',
      results: [],
    });
  }
  setRunningCode(false);
};



  const submitCode = async () => {
    await runCode();

    if (testResults.status === "Error") return;

    const isCorrect = testResults.status === "Success";

    const submission = {
      code,
      language,
      testResults,
      submittedAt: Date.now(),
      isCorrect,
      uid: userId,
    };

    // Save to Firebase
    await set(ref(database, `contests/${contestId}/problems/${problemId}/submissions/${userId}`), submission);
  };


  if (loading) {
    return (
      <div className="editor-container loading">
        <div className="loading-spinner"></div>
        <p>Loading problem...</p>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="editor-container error">
        <p>Error: Problem not found</p>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="editor-layout">
        {/* Left Panel - Problem Description */}
        <div className="problem-panel">
          <div className="problem-header">
            <h1>{problem.title}</h1>
            <div className="problem-metadata">
              <span className={`difficulty-badge ${problem.difficulty}`}>
                {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
              </span>
              <span className="topic-badge">{problem.topic}</span>
            </div>
          </div>

          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveTab('description')}
            >
              Description
            </button>
            <button 
              className={`tab-button ${activeTab === 'solutions' ? 'active' : ''}`}
              onClick={() => setActiveTab('solutions')}
            >
              Solutions
            </button>
            <button 
              className={`tab-button ${activeTab === 'submissions' ? 'active' : ''}`}
              onClick={() => setActiveTab('submissions')}
            >
              Submissions
            </button>
          </div>

          <div className="problem-content">
            {activeTab === 'description' && (
              <>
                <div className="problem-description">
                  <p>{problem.description}</p>
                </div>

                <div className="examples-section">
                  <h3>Examples:</h3>
                  {problem.examples.map((example, index) => (
                    <div className="example" key={index}>
                      <div className="example-header">Example {index + 1}:</div>
                      <div className="example-content">
                        <pre>Input: {example.input}</pre>
                        <pre>Output: {example.output}</pre>
                        {example.explanation && <pre>Explanation: {example.explanation}</pre>}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="constraints-section">
                  <h3>Constraints:</h3>
                  <ul>
                    {problem.constraints.map((constraint, index) => (
                      <li key={index}>{constraint}</li>
                    ))}
                  </ul>
                </div>

                <div className="complexity-section">
                  <h3>Complexity Analysis:</h3>
                  <p><strong>Time Complexity:</strong> {problem.timeComplexity}</p>
                  <p><strong>Space Complexity:</strong> {problem.spaceComplexity}</p>
                </div>
              </>
            )}

            {activeTab === 'solutions' && (
              <div className="solutions-tab">
                <p>Community solutions will appear here.</p>
              </div>
            )}

            {activeTab === 'submissions' && (
              <div className="submissions-tab">
                <p>Your submissions will appear here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="code-panel">
          <div className="editor-toolbar">
            <div className="toolbar-left">
              <div className="toolbar-item">
                <label>Language:</label>
                <select value={language} onChange={handleLanguageChange}>
                  {LANGUAGE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="toolbar-item">
                <label>Theme:</label>
                <select value={theme} onChange={handleThemeChange}>
                  <option value="vs-dark">Dark</option>
                  <option value="vs-light">Light</option>
                </select>
              </div>
              <div className="toolbar-item">
                <label>Font Size:</label>
                <select value={fontSize} onChange={handleFontSizeChange}>
                  {[12, 14, 16, 18, 20].map(size => (
                    <option key={size} value={size}>
                      {size}px
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="monaco-container">
            <MonacoEditor
              height="70vh"
              language={language}
              theme={theme}
              value={code}
              onChange={handleCodeChange}
              options={{
                fontSize: fontSize,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                tabSize: 2,
                lineNumbers: 'on',
                folding: true,
                renderLineHighlight: 'all',
              }}
            />
          </div>

          <div className="editor-actions">
            <button
              className="run-button"
              onClick={runCode}
              disabled={runningCode || submittingCode}
            >
              {runningCode ? 'Running...' : 'Run Code'}
            </button>
            <button
              className="submit-button"
              onClick={submitCode}
              disabled={runningCode || submittingCode}
            >
              {submittingCode ? 'Submitting...' : 'Submit Solution'}
            </button>
          </div>
        </div>
      </div>

      {/* Test Results Panel */}
      {testResults && (
        <div className={`test-results ${testResults.status.toLowerCase()}`}>
          <div className="results-header">
            <h3>{testResults.status}</h3>
            <p>{testResults.message}</p>
            {testResults.stats && (
              <div className="performance-stats">
                <span>Runtime: {testResults.stats.runtime}</span>
                <span>Memory: {testResults.stats.memory}</span>
                <div className="percentile-info">
                  <span>{testResults.stats.runtimePercentile}</span>
                  <span>{testResults.stats.memoryPercentile}</span>
                </div>
              </div>
            )}
          </div>
          
          {testResults.results && (
            <div className="test-cases">
              <h4>Test Cases:</h4>
              {testResults.results.map((result, index) => (
                <div key={index} className={`test-case ${result.passed ? 'passed' : 'failed'}`}>
                  <div className="test-case-header">
                    <span>Test Case {index + 1}</span>
                    <span className={`status ${result.passed ? 'passed' : 'failed'}`}>
                      {result.passed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                  <div className="test-case-details">
                    <div className="test-detail"><strong>Input:</strong> {result.input}</div>
                    <div className="test-detail"><strong>Your Output:</strong> {result.output}</div>
                    <div className="test-detail"><strong>Expected Output:</strong> {result.expected}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CodeEditor;