import React, { useState, useEffect } from 'react';
import { Settings, BarChart2, Cookie, Store, Dumbbell, Moon } from 'lucide-react';
import StatsModal from './components/StatsModal';
import TimerButton from './components/TimerButton';
import Gong from './components/Gong';
import { playGong } from './utils/audio';
import { getNow } from './utils/time';
import './App.css';

const TIMERS = [
  { id: 'snack', label: '간식', type: 1, icon: Cookie },
  { id: 'store', label: '편의점', type: 1, icon: Store },
  { id: 'gym', label: '헬스', type: 2, icon: Dumbbell },
  { id: 'sleep', label: '수면', type: 2, icon: Moon },
];

function App() {
  const [quotes, setQuotes] = useState([]);
  const [currentQuote, setCurrentQuote] = useState('');
  const [quoteSettings, setQuoteSettings] = useState(() => {
    return JSON.parse(localStorage.getItem('appetite_quote_settings')) ?? true;
  });
  const [showStats, setShowStats] = useState(false);
  const [quoteVisible, setQuoteVisible] = useState(false);
  const [timerStamps, setTimerStamps] = useState(() => {
    return JSON.parse(localStorage.getItem('appetite_timers')) || {
      snack: Date.now() - 86400000, 
      store: Date.now() - 43200000, 
      gym: Date.now() - 86400000,
      sleep: Date.now() - 43200000
    };
  });
  
  // Timer History { typeId: [timestamp, timestamp] }
  const [timerHistory, setTimerHistory] = useState(() => {
    return JSON.parse(localStorage.getItem('appetite_timer_history')) || {
      snack: [], store: [], gym: [], sleep: []
    };
  });

  const [gongHits, setGongHits] = useState(() => {
    return JSON.parse(localStorage.getItem('appetite_gong_hits')) || [];
  });

  useEffect(() => {
    fetch('./quotes.txt')
      .then(res => res.text())
      .then(text => {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const cleanQuotes = lines.map(line => line.replace(/^\d+:\s*(.*)/, '$1').replace(/"/g, ''));
        setQuotes(cleanQuotes);
      })
      .catch(err => console.error('Failed to load quotes:', err));
  }, []);

  useEffect(() => {
    localStorage.setItem('appetite_quote_settings', JSON.stringify(quoteSettings));
  }, [quoteSettings]);

  useEffect(() => {
    localStorage.setItem('appetite_timers', JSON.stringify(timerStamps));
  }, [timerStamps]);

  useEffect(() => {
    localStorage.setItem('appetite_timer_history', JSON.stringify(timerHistory));
  }, [timerHistory]);

  useEffect(() => {
    localStorage.setItem('appetite_gong_hits', JSON.stringify(gongHits));
  }, [gongHits]);

  const handleGongClick = () => {
    playGong();
    
    const now = Date.now();
    const hitsPastMinute = gongHits.filter(stamp => now - stamp < 60000).length;
    
    if (hitsPastMinute < 10) {
      setGongHits(prev => [...prev, now]);
    }

    if (quoteSettings && quotes.length > 0) {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      setCurrentQuote(randomQuote);
      setQuoteVisible(true);
      setTimeout(() => {
        setQuoteVisible(false);
      }, 7000);
    }
  };

  const handleTimerClick = (id) => {
    const now = getNow();
    setTimerStamps(prev => ({ ...prev, [id]: now }));
    setTimerHistory(prev => ({
      ...prev,
      [id]: [...(prev[id] || []), now]
    }));
  };

  return (
    <div className="app-container">
      <header className="header">
        <button 
          className={`icon-button ${quoteSettings ? 'active' : ''}`}
          onClick={() => setQuoteSettings(!quoteSettings)}
          aria-label="명언 설정"
        >
          <span className="button-text">명언</span>
        </button>

        <button 
          className="icon-button"
          onClick={() => setShowStats(true)}
          aria-label="통계"
        >
          <BarChart2 size={20} />
          <span className="button-text">통계</span>
        </button>
      </header>

      <main className="gong-container">
        <Gong onClick={handleGongClick} />
        <div className={`quote-overlay ${quoteVisible ? 'visible' : ''}`}>
          <p className="quote-text">{currentQuote}</p>
        </div>
      </main>

      <footer className="timers-container">
        <div className="timer-grid">
          {TIMERS.map(timer => (
            <TimerButton 
              key={timer.id}
              timer={timer}
              timestamp={timerStamps[timer.id]}
              onClick={() => handleTimerClick(timer.id)}
            />
          ))}
        </div>
      </footer>

      {showStats && (
        <StatsModal 
          gongHits={gongHits} 
          timerHistory={timerHistory}
          timers={TIMERS}
          onClose={() => setShowStats(false)} 
        />
      )}
    </div>
  );
}

export default App;
