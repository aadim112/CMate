import logo from './logo.svg';
import './App.css';
import AnswerGenerator from '../src/Components/AnswerGenerator.js';
import event from '../src/Assets/event.png';
import contest from '../src/Assets/contest.png';
import notes from '../src/Assets/notes.png';
import TextToSpeech from "./Components/TextToSpeech";
import { SpeechProvider } from './Components/SpeechContext.js';

function App() {
  return (
    <SpeechProvider>
      <div className="App">
        <div className='Home'>
          <div className='header'>
            <p style={{fontFamily:'Inter',fontSize:'40px',margin:'0px',fontWeight:'bold',color:'#779ce0',marginLeft:'20px',cursor:'pointer'}}>CMate</p>
          </div>
          <p style={{fontFamily:'Inter',fontSize:'50px',margin:'0px',fontWeight:'bold',width:'550px',marginLeft:'20px',marginTop:'30px'}}>Your AI Powered Assignemet Companion</p>
          <p style={{fontFamily:'Inter',fontSize:'20px',margin:'0px',width:'550px',marginLeft:'20px',marginTop:'20px'}}>Upload Assignemet and or Topic Related document and get accurate answers instantly</p>
          <div className='try-button'>Try Now</div>
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
        </div>
        <div className='introduction'></div>
        <AnswerGenerator/>
      </div>
      <TextToSpeech/>
    </SpeechProvider>
  );
}

export default App;
