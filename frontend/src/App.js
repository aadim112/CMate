import './App.css';
import { useState, useEffect } from 'react';
import MD5 from 'crypto-js/md5';

// Components
import Navigation from './Components/Navigation';
import AnswerGenerator from './Components/AnswerGenerator.js';
import NotesPage from './Components/Notes.js';
import SignupLogin from './Components/SignupLogin.js';
import DiscoverContest from './Components/DiscoverContest.js';
import CodeEditor from './Components/CodeEditor.js';
import ViewerMode from './Components/ViewerMode.js';

// Context
import { SpeechProvider } from './Components/SpeechContext.js';

// Assets
import event from './Assets/event.png';
import contest from './Assets/contest.png';
import notes from './Assets/notes.png';

function App() {
  const [signup, setSignup] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileImage, setProfileImage] = useState('');
  const [activeSection, setActiveSection] = useState('home');
  
  useEffect(() => {
    // Update profile image when user logs in
    if (currentUser && currentUser.email) {
      const gravatarHash = MD5(currentUser.email.toLowerCase().trim());
      setProfileImage(`https://www.gravatar.com/avatar/${gravatarHash}?d=identicon`);
    } else {
      setProfileImage('');
    }
  }, [currentUser]);

  const handleAccountAction = () => {
    if (currentUser) {
      // If user is logged in, show profile modal or other actions
      // For now, we'll just toggle the signup modal which will show the profile view
      setSignup(true);
    } else {
      // If no user, show signup/login modal
      setSignup(true);
    }
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'home':
        return (
          <div className='Home'>
            <p style={{fontFamily:'Inter',fontSize:'50px',margin:'0px',fontWeight:'bold',width:'550px',marginLeft:'20px',marginTop:'30px'}}>Your AI Powered Assignment Companion</p>
            <p style={{fontFamily:'Inter',fontSize:'20px',margin:'0px',width:'550px',marginLeft:'20px',marginTop:'20px'}}>Upload Assignment and or Topic Related document and get accurate answers instantly</p>
            <div className='try-button' onClick={() => setActiveSection('answer-generator')}>Try Now</div>
            <div className='features'>
              <div className='feature'>
                <img src={event} alt='event'/>
                <p>Participate in events</p>
              </div>
              <div className='feature'>
                <img src={contest} alt='contest'/>
                <p>Join contests</p>
              </div>
              <div className='feature'>
                <img src={notes} alt='notes'/>
                <p>Download notes</p>
              </div>
            </div>
            <div className='introduction'></div>
          </div>
        );
      case 'answer-generator':
        return <AnswerGenerator />;
      case 'notes':
        return <NotesPage />;
      case 'contests':
        return currentUser ? <DiscoverContest userUID={currentUser.uid} /> : <div className="auth-required">Please log in to access contests</div>;
      case 'viewer-mode':
        return <ViewerMode />;
      default:
        return <div>Section not found</div>;
    }
  };

  return (
    <SpeechProvider>
      <div className="App">
        <Navigation 
          currentUser={currentUser} 
          activeSection={activeSection} 
          setActiveSection={setActiveSection} 
        />
        
        <div className="header-actions">
          <div 
            className="profile-container" 
            onClick={handleAccountAction}
          >
            {currentUser ? (
              <div 
                className='profile-image' 
                style={{
                  backgroundImage: profileImage ? `url(${profileImage})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              ></div>
            ) : (
              <div className='login-button'>Signup/Login</div>
            )}
          </div>
        </div>
        
        <main className="main-content">
          {renderActiveSection()}
        </main>
        
        <SignupLogin 
          isOpen={signup} 
          onClose={() => setSignup(false)} 
          onLoginSuccess={setCurrentUser} 
        />
      </div>
    </SpeechProvider>
  );
}

export default App;