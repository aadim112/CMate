// src/Components/Navigation.js
import React, { useState, useEffect } from 'react';
import '../styles/Navigation.css';

const Navigation = ({ currentUser, activeSection, setActiveSection }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Handle scroll effect for sticky nav
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  const navItems = [
    { id: 'home', label: 'Home', requiresAuth: false },
    { id: 'answer-generator', label: 'Answer Generator', requiresAuth: false },
    { id: 'notes', label: 'Notes', requiresAuth: false },
    { id: 'contests', label: 'Contests', requiresAuth: true },
  ];

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close mobile menu when selecting a nav item
  const handleNavClick = (sectionId) => {
    setActiveSection(sectionId);
    setMobileMenuOpen(false);
  };

  return (
    <nav className={`main-navigation ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        <div className="nav-logo" onClick={() => handleNavClick('home')}>
          <p>CMate</p>
        </div>
        
        {/* Mobile menu button */}
        <div className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          <div className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        
        {/* Navigation items */}
        <ul className={`nav-items ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {navItems.map((item) => (
            (!item.requiresAuth || (item.requiresAuth && currentUser)) && (
              <li 
                key={item.id} 
                className={activeSection === item.id ? 'active' : ''}
                onClick={() => handleNavClick(item.id)}
              >
                {item.label}
              </li>
            )
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;