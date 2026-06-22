import React, { useState } from 'react';
import './Gong.css';

const GongIcon = () => (
  <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 20 H90 V25 H10 Z" fill="#333"/>
    <path d="M50 25 V35" stroke="#333" strokeWidth="5"/>
    <circle cx="50" cy="65" r="30" fill="#f0d165" stroke="#bfaa4f" strokeWidth="4"/>
    <circle cx="50" cy="65" r="20" fill="none" stroke="#dcb731" strokeWidth="2" strokeDasharray="5 5"/>
    <circle cx="50" cy="65" r="10" fill="#cc9b1b"/>
    <path d="M80 80 L60 65" stroke="#444" strokeWidth="6" strokeLinecap="round"/>
    <circle cx="60" cy="65" r="5" fill="#555"/>
  </svg>
);

const Gong = ({ onClick }) => {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    setClicked(true);
    onClick && onClick();
    setTimeout(() => setClicked(false), 200);
  };

  return (
    <div className={`gong-wrapper ${clicked ? 'clicked' : ''}`} onClick={handleClick}>
      <div className="ripple-base" />
      <div className="gong-inner">
        <GongIcon />
      </div>
    </div>
  );
};

export default Gong;
