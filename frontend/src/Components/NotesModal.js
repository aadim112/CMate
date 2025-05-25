import React, { useState, useRef } from 'react';
import '../styles/NotesModal.css';
import formimage from '../Assets/NotesExchangin.png';
import { uploadToCloudinary } from './uploadToCloudinary';
import {  database, ref, push, set } from '../firebase';


const NotesModal = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [tags, setTags] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  

  const handleFileChange = (e) => {
    const newFiles = e.target.files;
    if (newFiles.length > 0) {
      setFiles([...files, ...newFiles]);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      setFiles([...files, ...e.dataTransfer.files]);
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag);

    // Upload all files to Cloudinary
    const uploadPromises = files.map(file => uploadToCloudinary(file));
    const uploadedFileUrls = await Promise.all(uploadPromises);

    // Push to Firebase
    const notesRef = ref(database, 'notes');
    const newNoteRef = push(notesRef);

    await set(newNoteRef, {
      title,
      description,
      tags: tagArray,
      fileUrls: uploadedFileUrls,
      timestamp: Date.now(),
      likes:0,
      reports:0,
      userid:'',
    });

    // Clear form
    setTitle('');
    setDescription('');
    setFiles([]);
    setTags('');
    onClose();
    alert('Note published successfully!');
  } catch (error) {
    console.error('Error submitting note:', error);
    alert('Failed to publish note. Please try again.');
  }
};


  const openFileDialog = () => {
    fileInputRef.current.click();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div>
          <h2>Publish Your Notes</h2>
          <form onSubmit={handleSubmit}>
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
              required
            />

            <label>Upload Files</label>
            <div
              className={`file-drop-area ${isDragging ? 'dragging' : ''}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={openFileDialog}
            >
              <input
                type="file"
                onChange={handleFileChange}
                multiple
                style={{ display: 'none' }}
                ref={fileInputRef}
              />
              <div className="file-drop-content">
                <p>Drag and drop files here or click to browse</p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="file-list">
                <p>Selected files:</p>
                <ul>
                  {Array.from(files).map((file, index) => (
                    <li key={index}>
                      {file.name}
                      <button 
                        type="button" 
                        className="remove-file-btn"
                        onClick={() => handleRemoveFile(index)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <label>Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. physics, mcq, semester2"
            />

            <div className="modal-actions">
              <button type="submit">Publish</button>
              <button type="button" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
        <img src={formimage} alt="Notes exchange illustration" />
      </div>
    </div>
  );
};

export default NotesModal;