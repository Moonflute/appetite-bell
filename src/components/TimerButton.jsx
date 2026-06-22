import React, { useState, useEffect } from 'react';
import './TimerButton.css';
import { getNow } from '../utils/time';

const formatTime = (ms) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
};

const getStatusColor = (ms, type) => {
  const hours = ms / (1000 * 60 * 60);
  
  if (type === 1) {
    if (hours < 1) return 'bad'; 
    if (hours < 4) return 'warn'; 
    return 'good'; 
  } else {
    if (hours < 4) return 'good'; 
    if (hours < 12) return 'warn'; 
    return 'bad'; 
  }
};

const TimerButton = ({ timer, timestamp, onClick }) => {
  const [currentTime, setCurrentTime] = useState(getNow);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(getNow());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const elapsed = currentTime - timestamp;

  const IconGroup = timer.icon;
  const status = getStatusColor(elapsed, timer.type);

  return (
    <div className={`timer-item status-${status}`}>
      <button 
        className="timer-icon-btn" 
        onClick={onClick}
        aria-label={timer.label}
      >
        <span className="pulse-ring"></span>
        <IconGroup className="timer-icon" />
      </button>
      <div className="timer-text-container">
        <span className="timer-duration">{formatTime(elapsed)}</span>
      </div>
    </div>
  );
};

export default TimerButton;
