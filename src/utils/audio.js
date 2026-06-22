export function playGong() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const t = ctx.currentTime;
  
  // 마음이 편안해지는 단순하고 낮은 종소리 (Harmonic Bell)
  const baseFreq = 130; 
  // 불협화음(쇳소리)을 빼고 듣기 편안한 정수배(Harmonic) 배음만 사용
  const ratios = [1, 2, 3, 4.2]; 
  
  ratios.forEach((ratio, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = baseFreq * ratio;
    
    // 불쾌한 잡음 없이 맑고 부드러운 사인파(Sine wave)만 100% 사용
    osc.type = 'sine';
    
    // 부드러운 타격 벤딩 효과 
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.98, t + 2);
    
    // 볼륨 (저음 위주로 구성)
    const maxGain = (i === 0 ? 1.2 : (1.0 / (i + 1))) * 0.5;
    gain.gain.setValueAtTime(0, t);
    
    // 타격음이 부드럽게 퍼지도록 어택 속도 완화
    gain.gain.linearRampToValueAtTime(maxGain, t + 0.02); 
    
    // 감쇠 (은은하게 울리다 사라짐)
    const sustain = 3.5 - (i * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, t + sustain);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t);
    osc.stop(t + 4);
  });
}
