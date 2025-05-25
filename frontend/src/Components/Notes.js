import React, { useState, useEffect } from 'react';
import '../styles/Notes.css';
import NotesModal from './NotesModal';
import { database } from '../firebase'; // Import the firebase config
import { ref, onValue, push, set, off } from 'firebase/database';
import bg from '../Assets/bg.png'

const NotesPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch notes from Firebase
  useEffect(() => {
    const notesRef = ref(database, 'notes');
    onValue(notesRef, (snapshot) => {
      const notesData = snapshot.val();
      const loadedNotes = [];

      for (let key in notesData) {
        loadedNotes.push({ id: key, ...notesData[key] });
      }

      console.log("Fetched Notes from Firebase:", loadedNotes);
      setNotes(loadedNotes);
    });

    return () => {
      off(notesRef); // ✅ clean up
    };
  }, []);


  const handlePublish = (noteData) => {
    const newNote = {
      ...noteData,
      author: "You",
      supports: 0,
      timestamp: Date.now(),
    };

    const notesRef = ref(database, 'notes');
    const newNoteRef = push(notesRef);
    set(newNoteRef, newNote);

    setNotes(prev => [...prev, { ...newNote, id: newNoteRef.key }]);
  };


  // Filter notes based on search query (tags)
const filteredNotes = searchQuery.trim() === ''
    ? notes
    : notes.filter(note =>
        note.tags && note.tags.some(tag =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );



  return (
    <div className='Notes-component'>
      <div className='header'>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        </div>
        <div
          style={{
            width: '150px',
            height: '35px',
            backgroundColor: '#4979cd',
            marginRight: '20px',
            borderRadius: '8px',
            color: 'white',
            fontFamily: 'Inter',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onClick={() => setShowModal(true)}
        >
          <p>Publish Notes</p>
        </div>
      </div>

      <div className='search-bar'>
        <div className='search'>
          <input
            type='text'
            placeholder='Search by Tags'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className='result-notes'>
        {filteredNotes.map((note) => (
          <div className='notes' key={note.id}>
            <h2 style={{ marginLeft: '20px', marginTop: '10px', marginBottom: '5px' }}>{note.title}</h2>
            <p style={{ margin: '0px', marginLeft: '20px' }}>{note.description}</p>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              position: 'absolute',
              bottom: '10px',
              width: '500px',
              marginLeft: '20px'
            }}>
              <p>Support({note.supports})</p>
              <p style={{ color: 'red' }}>Report</p>
              <p>Published by: {note.author}</p>
            </div>
          </div>
        ))}
      </div>

      <NotesModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handlePublish}
      />
    </div>
  );
};

export default NotesPage;
