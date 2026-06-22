import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ScatterChart, Scatter, ZAxis } from 'recharts';
import './StatsModal.css';
import { getNow } from '../utils/time';

const formatFullTime = (timestamp) => {
  const d = new Date(timestamp);
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <p className="time">{formatFullTime(data.x)}</p>
      </div>
    );
  }
  return null;
};

const StatsModal = ({ gongHits, timerHistory, timers, onClose }) => {
  const [tab, setTab] = useState('day');

  const chartData = useMemo(() => {
    const dataMap = {};
    const now = new Date();

    if (tab === 'day') {
      for (let i = 0; i < 24; i++) {
        const d = new Date(now.getTime() - i * 3600000);
        dataMap[`${d.getHours()}시`] = 0;
      }
      gongHits.forEach(timestamp => {
        if (now.getTime() - timestamp <= 24 * 3600000) {
          const k = `${new Date(timestamp).getHours()}시`;
          if (dataMap[k] !== undefined) dataMap[k]++;
        }
      });
    } else if (tab === 'week') {
      for (let i = 0; i < 7; i++) {
        const d = new Date(now.getTime() - i * 86400000);
        dataMap[`${d.getMonth() + 1}/${d.getDate()}`] = 0;
      }
      gongHits.forEach(timestamp => {
        if (now.getTime() - timestamp <= 7 * 86400000) {
          const d = new Date(timestamp);
          const k = `${d.getMonth() + 1}/${d.getDate()}`;
          if (dataMap[k] !== undefined) dataMap[k]++;
        }
      });
    } else if (tab === 'month') {
      for (let i = 0; i < 30; i++) {
        const d = new Date(now.getTime() - i * 86400000);
        dataMap[`${d.getMonth() + 1}/${d.getDate()}`] = 0;
      }
      gongHits.forEach(timestamp => {
        if (now.getTime() - timestamp <= 30 * 86400000) {
          const d = new Date(timestamp);
          const k = `${d.getMonth() + 1}/${d.getDate()}`;
          if (dataMap[k] !== undefined) dataMap[k]++;
        }
      });
    }

    return Object.keys(dataMap)
      .reverse()
      .map(key => ({ name: key, hits: dataMap[key] }));
  }, [gongHits, tab]);

  const scatterData = useMemo(() => {
    // All history for scatter
    const colors = {
      'snack': '#ff9500',   // Orange
      'store': '#ff3b30',   // Red
      'gym': '#34c759',     // Green
      'sleep': '#007aff'    // Blue
    };

    let minTime = getNow();
    let maxTime = getNow();

    const datasets = timers.map((t) => {
      const history = (timerHistory[t.id] || []);
      history.forEach(stamp => {
        if (stamp < minTime) minTime = stamp;
        if (stamp > maxTime) maxTime = stamp;
      });

      return {
        id: t.id,
        label: t.label,
        color: colors[t.id],
        data: history.map(stamp => ({
          x: stamp,
          y: t.label
        }))
      };
    });

    // Add padding to domain (12 hours)
    minTime -= 12 * 3600000;
    maxTime += 12 * 3600000;
    
    // Calculate total days for chart width
    const days = Math.max(3, Math.ceil((maxTime - minTime) / 86400000));
    const chartWidth = days * 120; // 120px per day

    return { datasets, minTime, maxTime, colors, chartWidth };
  }, [timerHistory, timers]);

  const dateFormatter = (time) => {
    const d = new Date(time);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="닫기">
          <X size={28} />
        </button>

        <h2 className="modal-title">징 횟수 (횟수/시간)</h2>
        
        <div className="tabs">
          <button className={`tab ${tab === 'day' ? 'active' : ''}`} onClick={() => setTab('day')}>시간(24H)</button>
          <button className={`tab ${tab === 'week' ? 'active' : ''}`} onClick={() => setTab('week')}>주(7D)</button>
          <button className={`tab ${tab === 'month' ? 'active' : ''}`} onClick={() => setTab('month')}>월(30D)</button>
        </div>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" vertical={false} />
              <XAxis dataKey="name" stroke="#666" fontSize={12} tickMargin={10} />
              <YAxis stroke="#666" fontSize={12} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }} 
                itemStyle={{ color: '#000' }}
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              />
              <Bar dataKey="hits" fill="var(--color-good)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <h2 className="modal-title" style={{marginTop: '10px'}}>버튼 터치 기록 (전체)</h2>
        <div className="scatter-scroll-container">
          <div className="scatter-inner" style={{ width: `${scatterData.chartWidth}px`, height: '150px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 15, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#eee" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  domain={[scatterData.minTime, scatterData.maxTime]} 
                  tickFormatter={dateFormatter} 
                  stroke="#666" 
                  fontSize={12}
                  tickCount={Math.max(5, Math.ceil(scatterData.chartWidth / 100))}
                />
                <YAxis 
                  type="category" 
                  dataKey="y" 
                  name="항목"
                  allowDuplicatedCategory={false}
                  stroke="#666" 
                  fontSize={12}
                  width={60}
                  ticks={timers.map(t => t.label)}
                />
                <ZAxis range={[50, 50]} />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                {scatterData.datasets.map(dataset => (
                  <Scatter 
                    key={dataset.id} 
                    name={dataset.label} 
                    data={dataset.data} 
                    fill={dataset.color} 
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="scatter-legend">
          {scatterData.datasets.map(dataset => (
            <div key={dataset.id} className="legend-item">
              <span className="legend-color" style={{backgroundColor: dataset.color}}></span>
              <span className="legend-label">{dataset.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
