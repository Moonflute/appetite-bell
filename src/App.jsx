import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  BellRing,
  BrainCircuit,
  Cookie,
  Dumbbell,
  Flame,
  Moon,
  Radar,
  Scale,
  Sparkles,
  Store,
  Target,
  TrendingDown,
  TrendingUp,
  Utensils,
  Waves,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Gong from './components/Gong';
import TimerButton from './components/TimerButton';
import { playGong } from './utils/audio';
import { getNow } from './utils/time';
import './App.css';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0-local';

const STORAGE_KEYS = {
  profile: 'weight_command_profile_v2',
  scans: 'weight_command_scans_v2',
  workouts: 'weight_command_workouts_v2',
  reminders: 'weight_command_reminders_v2',
  reminderState: 'weight_command_reminder_state_v2',
  timerStamps: 'weight_command_timer_stamps_v2',
  timerHistory: 'weight_command_timer_history_v2',
  gongHits: 'weight_command_gong_hits_v2',
};

const TIMER_PRESETS = [
  { id: 'meal', label: 'Meal', type: 1, icon: Cookie },
  { id: 'snack', label: 'Snack', type: 1, icon: Store },
  { id: 'workout', label: 'Workout', type: 2, icon: Dumbbell },
  { id: 'sleep', label: 'Sleep', type: 2, icon: Moon },
];

const ACTIVITY_OPTIONS = [
  { value: 1.2, label: 'Sedentary' },
  { value: 1.35, label: 'Lightly active' },
  { value: 1.5, label: 'Moderately active' },
  { value: 1.7, label: 'Very active' },
];

const WORKOUT_LIBRARY = {
  walk: { label: 'Walk / Zone 2', met: 3.8 },
  run: { label: 'Run', met: 8.6 },
  upper: { label: 'Upper Strength', met: 5.5 },
  lower: { label: 'Lower Strength', met: 6.2 },
  hiit: { label: 'HIIT', met: 9.5 },
  cycle: { label: 'Cycling', met: 7.4 },
  yoga: { label: 'Mobility / Yoga', met: 2.8 },
};

const INTENSITY_FACTORS = {
  low: 0.9,
  medium: 1,
  high: 1.15,
};

const DEFAULT_PROFILE = {
  sex: 'male',
  age: 31,
  heightCm: 176,
  targetWeight: 68,
  dailyIntakeCalories: 2050,
  activityMultiplier: 1.35,
  proteinTarget: 150,
};

const DEFAULT_SCANS = [
  { date: '2026-06-18', weight: 74.8, bodyFat: 22.4, muscle: 31.1, bmi: 24.1 },
  { date: '2026-06-20', weight: 74.2, bodyFat: 22.0, muscle: 31.3, bmi: 23.9 },
  { date: '2026-06-23', weight: 73.6, bodyFat: 21.8, muscle: 31.5, bmi: 23.8 },
];

const DEFAULT_WORKOUTS = [
  { id: 'w1', date: '2026-06-21', type: 'upper', minutes: 55, intensity: 'high', calories: 387 },
  { id: 'w2', date: '2026-06-22', type: 'walk', minutes: 48, intensity: 'medium', calories: 224 },
];

const DEFAULT_REMINDERS = [
  { id: 'r1', time: '07:30', message: 'Hydrate, scan body weight, log morning state.' },
  { id: 'r2', time: '18:40', message: 'Training block. Record workout and recovery.' },
];

const DEFAULT_REMINDER_STATE = {};

const DEFAULT_TIMER_STAMPS = {
  meal: getNow() - 4 * 60 * 60 * 1000,
  snack: getNow() - 90 * 60 * 1000,
  workout: getNow() - 26 * 60 * 60 * 1000,
  sleep: getNow() - 8 * 60 * 60 * 1000,
};

const DEFAULT_TIMER_HISTORY = {
  meal: [],
  snack: [],
  workout: [],
  sleep: [],
};

const DEFAULT_QUOTES = [
  'System stable. You are building momentum.',
  'Small entries create long-term signal.',
  'Discipline looks quiet before it looks dramatic.',
  'Keep feeding the trajectory you want.',
  'Today is another clean data point.',
];

function readStoredValue(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function toDateInputValue(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function formatShortDate(dateString) {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function calculateBmr({ sex, age, heightCm, weight }) {
  if (!heightCm || !weight || !age) return 0;
  const base = 10 * weight + 6.25 * heightCm - 5 * age;
  return sex === 'female' ? base - 161 : base + 5;
}

function calculateWorkoutCalories({ type, minutes, intensity, weight }) {
  const preset = WORKOUT_LIBRARY[type];
  if (!preset || !minutes || !weight) return 0;
  const factor = INTENSITY_FACTORS[intensity] ?? 1;
  const hours = minutes / 60;
  return Math.round(preset.met * factor * weight * hours);
}

function App() {
  const [currentTime, setCurrentTime] = useState(getNow);
  const [profile, setProfile] = useState(() => readStoredValue(STORAGE_KEYS.profile, DEFAULT_PROFILE));
  const [bodyScans, setBodyScans] = useState(() => readStoredValue(STORAGE_KEYS.scans, DEFAULT_SCANS));
  const [workouts, setWorkouts] = useState(() => readStoredValue(STORAGE_KEYS.workouts, DEFAULT_WORKOUTS));
  const [reminders, setReminders] = useState(() => readStoredValue(STORAGE_KEYS.reminders, DEFAULT_REMINDERS));
  const [timerStamps, setTimerStamps] = useState(() => readStoredValue(STORAGE_KEYS.timerStamps, DEFAULT_TIMER_STAMPS));
  const [timerHistory, setTimerHistory] = useState(() => readStoredValue(STORAGE_KEYS.timerHistory, DEFAULT_TIMER_HISTORY));
  const [gongHits, setGongHits] = useState(() => readStoredValue(STORAGE_KEYS.gongHits, []));
  const [quoteVisible, setQuoteVisible] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(DEFAULT_QUOTES[0]);
  const reminderStateRef = useRef(readStoredValue(STORAGE_KEYS.reminderState, DEFAULT_REMINDER_STATE));
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );

  const [scanForm, setScanForm] = useState({
    date: toDateInputValue(getNow()),
    weight: '',
    bodyFat: '',
    muscle: '',
  });
  const [workoutForm, setWorkoutForm] = useState({
    date: toDateInputValue(getNow()),
    type: 'upper',
    minutes: 45,
    intensity: 'medium',
  });
  const [reminderForm, setReminderForm] = useState({
    time: '08:00',
    message: '',
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(getNow());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.scans, JSON.stringify(bodyScans));
  }, [bodyScans]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.workouts, JSON.stringify(workouts));
  }, [workouts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.timerStamps, JSON.stringify(timerStamps));
  }, [timerStamps]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.timerHistory, JSON.stringify(timerHistory));
  }, [timerHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.gongHits, JSON.stringify(gongHits));
  }, [gongHits]);

  const sortedScans = [...bodyScans].sort((a, b) => a.date.localeCompare(b.date));
  const sortedWorkouts = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
  const latestScan = sortedScans[sortedScans.length - 1];
  const previousScan = sortedScans[sortedScans.length - 2];
  const currentWeight = latestScan?.weight || 0;
  const currentDateKey = new Date(currentTime).toISOString().slice(0, 10);
  const currentTimeLabel = new Date(currentTime).toTimeString().slice(0, 5);
  const todayWorkoutCalories = sortedWorkouts
    .filter((entry) => entry.date === currentDateKey)
    .reduce((sum, entry) => sum + Number(entry.calories || 0), 0);
  const last7WorkoutCalories = sortedWorkouts
    .filter((entry) => currentTime - new Date(entry.date).getTime() <= 7 * 24 * 60 * 60 * 1000)
    .reduce((sum, entry) => sum + Number(entry.calories || 0), 0);
  const last7WorkoutMinutes = sortedWorkouts
    .filter((entry) => currentTime - new Date(entry.date).getTime() <= 7 * 24 * 60 * 60 * 1000)
    .reduce((sum, entry) => sum + Number(entry.minutes || 0), 0);
  const averageDailyExerciseBurn = last7WorkoutCalories / 7;
  const bmr = calculateBmr({
    sex: profile.sex,
    age: Number(profile.age),
    heightCm: Number(profile.heightCm),
    weight: currentWeight,
  });
  const passiveBurn = bmr * Number(profile.activityMultiplier || 1.2);
  const totalBurn = passiveBurn + averageDailyExerciseBurn;
  const dailyNetCalories = Number(profile.dailyIntakeCalories || 0) - totalBurn;

  const observedDeltaPerDay = sortedScans.length > 1
    ? (sortedScans[sortedScans.length - 1].weight - sortedScans[0].weight) / (sortedScans.length - 1)
    : 0;
  const modeledDeltaPerDay = dailyNetCalories / 7700;
  const projectedDeltaPerDay = modeledDeltaPerDay * 0.7 + observedDeltaPerDay * 0.3;

  const forecastPoints = currentWeight
    ? Array.from({ length: 31 }, (_, index) => {
        const projectedWeight = currentWeight + projectedDeltaPerDay * index;
        const phase = Math.sin((currentTime / 1000 + index) / 3) * 0.08;
        return {
          label: index === 0 ? 'Now' : `+${index}d`,
          projectedWeight: Number((projectedWeight + phase).toFixed(2)),
          stableWeight: Number(projectedWeight.toFixed(2)),
          targetWeight: Number(profile.targetWeight),
        };
      })
    : [];

  const horizonCards = [1, 3, 7, 30].map((days) => ({
    days,
    weight: currentWeight ? Number((currentWeight + projectedDeltaPerDay * days).toFixed(2)) : 0,
  }));

  const trendData = sortedScans.map((entry) => ({
    label: formatShortDate(entry.date),
    weight: entry.weight,
    bodyFat: entry.bodyFat,
    muscle: entry.muscle,
  }));

  const workoutPreviewCalories = calculateWorkoutCalories({
    type: workoutForm.type,
    minutes: Number(workoutForm.minutes),
    intensity: workoutForm.intensity,
    weight: currentWeight || sortedScans[0]?.weight || 70,
  });

  const weightDelta = latestScan && previousScan
    ? Number((latestScan.weight - previousScan.weight).toFixed(1))
    : 0;
  const activeReminderNow = reminders.find((reminder) => reminder.time === currentTimeLabel);

  const handleScanSubmit = (event) => {
    event.preventDefault();
    if (!scanForm.date || !scanForm.weight) return;

    const weight = Number(scanForm.weight);
    const bmi = profile.heightCm
      ? Number((weight / ((Number(profile.heightCm) / 100) ** 2)).toFixed(1))
      : 0;

    const nextEntry = {
      date: scanForm.date,
      weight,
      bodyFat: Number(scanForm.bodyFat || 0),
      muscle: Number(scanForm.muscle || 0),
      bmi,
    };

    setBodyScans((prev) => {
      const filtered = prev.filter((entry) => entry.date !== nextEntry.date);
      return [...filtered, nextEntry];
    });

    setScanForm((prev) => ({
      ...prev,
      weight: '',
      bodyFat: '',
      muscle: '',
    }));
  };

  const handleWorkoutSubmit = (event) => {
    event.preventDefault();
    if (!workoutForm.date || !workoutForm.minutes) return;

    setWorkouts((prev) => [
      {
        id: `${workoutForm.type}-${getNow()}`,
        date: workoutForm.date,
        type: workoutForm.type,
        minutes: Number(workoutForm.minutes),
        intensity: workoutForm.intensity,
        calories: workoutPreviewCalories,
      },
      ...prev,
    ]);

    setWorkoutForm((prev) => ({
      ...prev,
      minutes: 45,
      intensity: 'medium',
    }));
  };

  const handleReminderSubmit = (event) => {
    event.preventDefault();
    if (!reminderForm.time || !reminderForm.message.trim()) return;

    setReminders((prev) => [
      ...prev,
      {
        id: `${reminderForm.time}-${getNow()}`,
        time: reminderForm.time,
        message: reminderForm.message.trim(),
      },
    ]);

    setReminderForm((prev) => ({ ...prev, message: '' }));
  };

  const removeReminder = (id) => {
    setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
  };

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  useEffect(() => {
    const matchedReminder = reminders.find((reminder) => reminder.time === currentTimeLabel);
    if (!matchedReminder) return;

    const alreadySent = reminderStateRef.current[matchedReminder.id] === currentDateKey;
    if (alreadySent) return;

    reminderStateRef.current = {
      ...reminderStateRef.current,
      [matchedReminder.id]: currentDateKey,
    };
    localStorage.setItem(STORAGE_KEYS.reminderState, JSON.stringify(reminderStateRef.current));

    if (typeof Notification !== 'undefined' && notificationPermission === 'granted') {
      new Notification('Appetite Bell Alert', {
        body: matchedReminder.message,
      });
    }
  }, [currentDateKey, currentTimeLabel, notificationPermission, reminders]);

  const handleGongClick = () => {
    playGong();
    setGongHits((prev) => [...prev, getNow()]);
    setCurrentQuote(DEFAULT_QUOTES[Math.floor((getNow() / 1000) % DEFAULT_QUOTES.length)]);
    setQuoteVisible(true);
    setTimeout(() => setQuoteVisible(false), 3200);
  };

  const handleTimerClick = (id) => {
    const now = getNow();
    setTimerStamps((prev) => ({ ...prev, [id]: now }));
    setTimerHistory((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), now],
    }));
  };

  return (
    <div className="app-shell">
      <div className="bg-grid" />
      <div className="bg-orb orb-a" />
      <div className="bg-orb orb-b" />

      <main className="app-container">
        <section className="hero-panel panel">
          <div className="hero-copy">
            <div className="eyebrow">
              <Sparkles size={14} />
              <span>Metabolic Flight Deck</span>
            </div>
            <div className="version-pill">Build {APP_VERSION}</div>
            <h1>체중 관리용 SF 라이브 시뮬레이터</h1>
            <p>
              키, 체중, 인바디, 운동, 식사량, 활동량을 하나로 묶어 실시간에 가까운
              체중 변화를 예측하는 미래형 바디 매니지먼트 콘솔입니다.
            </p>

            <div className="hero-live">
              <div className="live-core">
                <div className="core-ring ring-a" />
                <div className="core-ring ring-b" />
                <div className="core-center">{currentWeight ? `${currentWeight.toFixed(1)}kg` : '--'}</div>
              </div>
              <div className="live-readout">
                <span>Live simulation tick</span>
                <strong>{new Date(currentTime).toLocaleTimeString('ko-KR')}</strong>
                <p>
                  {activeReminderNow
                    ? `${activeReminderNow.time} · ${activeReminderNow.message}`
                    : 'No active alert. System tracking intake, load, and mass drift.'}
                </p>
              </div>
            </div>
          </div>

          <div className="hero-stats">
            <div className="stat-card accent-cyan">
              <span className="stat-label">Current Mass</span>
              <strong>{currentWeight ? `${currentWeight.toFixed(1)} kg` : 'No data'}</strong>
              <span className={`delta ${weightDelta <= 0 ? 'down' : 'up'}`}>
                {weightDelta <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                {previousScan ? `${Math.abs(weightDelta).toFixed(1)} kg vs last scan` : 'First scan'}
              </span>
            </div>

            <div className="stat-card accent-lime">
              <span className="stat-label">Daily Net</span>
              <strong>{Math.round(dailyNetCalories)} kcal</strong>
              <span className="subtle-text">{projectedDeltaPerDay.toFixed(3)} kg/day projected drift</span>
            </div>

            <div className="stat-card accent-amber">
              <span className="stat-label">Exercise Burn</span>
              <strong>{Math.round(averageDailyExerciseBurn)} kcal/day</strong>
              <span className="subtle-text">{last7WorkoutMinutes} min over the last 7 days</span>
            </div>
          </div>
        </section>

        <section className="control-grid control-grid--three">
          <div className="panel profile-panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">Body Profile</span>
                <h2>현재 키 / 대사 설정</h2>
              </div>
              <BrainCircuit size={18} />
            </div>

            <div className="profile-grid">
              <label>
                <span>Sex</span>
                <select value={profile.sex} onChange={(e) => setProfile((prev) => ({ ...prev, sex: e.target.value }))}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>
              <label>
                <span>Age</span>
                <input
                  type="number"
                  value={profile.age}
                  onChange={(e) => setProfile((prev) => ({ ...prev, age: Number(e.target.value) }))}
                />
              </label>
              <label>
                <span>Height (cm)</span>
                <input
                  type="number"
                  value={profile.heightCm}
                  onChange={(e) => setProfile((prev) => ({ ...prev, heightCm: Number(e.target.value) }))}
                />
              </label>
              <label>
                <span>Target Weight</span>
                <input
                  type="number"
                  step="0.1"
                  value={profile.targetWeight}
                  onChange={(e) => setProfile((prev) => ({ ...prev, targetWeight: Number(e.target.value) }))}
                />
              </label>
              <label>
                <span>Daily Intake (kcal)</span>
                <input
                  type="number"
                  value={profile.dailyIntakeCalories}
                  onChange={(e) => setProfile((prev) => ({ ...prev, dailyIntakeCalories: Number(e.target.value) }))}
                />
              </label>
              <label>
                <span>Activity</span>
                <select
                  value={profile.activityMultiplier}
                  onChange={(e) => setProfile((prev) => ({ ...prev, activityMultiplier: Number(e.target.value) }))}
                >
                  {ACTIVITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="metric-strip">
              <div>
                <span>BMR</span>
                <strong>{Math.round(bmr)} kcal</strong>
              </div>
              <div>
                <span>TDEE</span>
                <strong>{Math.round(totalBurn)} kcal</strong>
              </div>
              <div>
                <span>Protein</span>
                <strong>{profile.proteinTarget} g</strong>
              </div>
            </div>
          </div>

          <div className="panel data-panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">Body Scan</span>
                <h2>체중 / 인바디 입력</h2>
              </div>
              <Scale size={18} />
            </div>

            <form className="stack-form" onSubmit={handleScanSubmit}>
              <div className="quad-fields">
                <label>
                  <span>Date</span>
                  <input
                    type="date"
                    value={scanForm.date}
                    onChange={(e) => setScanForm((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Weight (kg)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={scanForm.weight}
                    onChange={(e) => setScanForm((prev) => ({ ...prev, weight: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Body Fat %</span>
                  <input
                    type="number"
                    step="0.1"
                    value={scanForm.bodyFat}
                    onChange={(e) => setScanForm((prev) => ({ ...prev, bodyFat: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Muscle (kg)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={scanForm.muscle}
                    onChange={(e) => setScanForm((prev) => ({ ...prev, muscle: e.target.value }))}
                  />
                </label>
              </div>
              <button className="primary-button" type="submit">Log Body Scan</button>
            </form>

            <div className="scan-summary">
              <div>
                <span>Latest BMI</span>
                <strong>{latestScan?.bmi?.toFixed(1) || '--'}</strong>
              </div>
              <div>
                <span>Body Fat</span>
                <strong>{latestScan ? `${latestScan.bodyFat.toFixed(1)}%` : '--'}</strong>
              </div>
              <div>
                <span>Muscle</span>
                <strong>{latestScan ? `${latestScan.muscle.toFixed(1)} kg` : '--'}</strong>
              </div>
            </div>
          </div>

          <div className="panel data-panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">Training Input</span>
                <h2>운동 자동 칼로리 기록</h2>
              </div>
              <Dumbbell size={18} />
            </div>

            <form className="stack-form" onSubmit={handleWorkoutSubmit}>
              <div className="triple-fields">
                <label>
                  <span>Date</span>
                  <input
                    type="date"
                    value={workoutForm.date}
                    onChange={(e) => setWorkoutForm((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Workout</span>
                  <select
                    value={workoutForm.type}
                    onChange={(e) => setWorkoutForm((prev) => ({ ...prev, type: e.target.value }))}
                  >
                    {Object.entries(WORKOUT_LIBRARY).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Intensity</span>
                  <select
                    value={workoutForm.intensity}
                    onChange={(e) => setWorkoutForm((prev) => ({ ...prev, intensity: e.target.value }))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </div>

              <div className="inline-fields">
                <label>
                  <span>Minutes</span>
                  <input
                    type="number"
                    value={workoutForm.minutes}
                    onChange={(e) => setWorkoutForm((prev) => ({ ...prev, minutes: Number(e.target.value) }))}
                  />
                </label>
                <div className="calorie-preview">
                  <span>Auto-burn estimate</span>
                  <strong>{workoutPreviewCalories} kcal</strong>
                  <p>현재 체중과 운동 타입, 강도를 기준으로 자동 계산됩니다.</p>
                </div>
              </div>

              <button className="primary-button" type="submit">Log Workout Burn</button>
            </form>

            <div className="scan-summary">
              <div>
                <span>Today Burn</span>
                <strong>{todayWorkoutCalories} kcal</strong>
              </div>
              <div>
                <span>Last 7 Days</span>
                <strong>{last7WorkoutCalories} kcal</strong>
              </div>
              <div>
                <span>Sessions</span>
                <strong>{sortedWorkouts.length}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="charts-grid">
          <div className="panel chart-panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">Trend Scanner</span>
                <h2>체중 / 체지방 / 근육량 추세</h2>
              </div>
              <Activity size={18} />
            </div>

            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid stroke="rgba(150, 245, 255, 0.12)" vertical={false} />
                  <XAxis dataKey="label" stroke="#7fd9e6" />
                  <YAxis stroke="#7fd9e6" />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(8, 18, 30, 0.92)',
                      border: '1px solid rgba(127, 217, 230, 0.2)',
                      borderRadius: '14px',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="weight" name="Weight" stroke="#7af7ff" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="bodyFat" name="Body Fat" stroke="#ff8d6d" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="muscle" name="Muscle" stroke="#b7ff7a" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel chart-panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">Prediction Engine</span>
                <h2>1 · 3 · 7 · 30일 체중 예측</h2>
              </div>
              <Radar size={18} />
            </div>

            <div className="forecast-card-row">
              {horizonCards.map((item) => (
                <div key={item.days} className="forecast-mini">
                  <span>{item.days}d</span>
                  <strong>{item.weight.toFixed(2)} kg</strong>
                </div>
              ))}
            </div>

            <div className="simulation-copy">
              <span>Modeled drift: {modeledDeltaPerDay.toFixed(3)} kg/day</span>
              <span>Observed drift: {observedDeltaPerDay.toFixed(3)} kg/day</span>
              <span>Target: {profile.targetWeight.toFixed(1)} kg</span>
            </div>

            <div className="chart-wrap chart-wrap--tall">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastPoints}>
                  <CartesianGrid stroke="rgba(183, 255, 122, 0.10)" vertical={false} />
                  <XAxis dataKey="label" stroke="#c5ff8d" />
                  <YAxis stroke="#c5ff8d" domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 21, 17, 0.94)',
                      border: '1px solid rgba(183, 255, 122, 0.25)',
                      borderRadius: '14px',
                    }}
                  />
                  <Legend />
                  <ReferenceLine y={profile.targetWeight} stroke="#ffcf67" strokeDasharray="6 6" />
                  <Line type="monotone" dataKey="stableWeight" name="Projected" stroke="#b7ff7a" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="projectedWeight" name="Live Simulation" stroke="#7af7ff" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="control-grid">
          <div className="panel reminder-panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">Alert Matrix</span>
                <h2>웹앱 알림 슬롯</h2>
              </div>
              <BellRing size={18} />
            </div>

            <form className="stack-form" onSubmit={handleReminderSubmit}>
              <div className="inline-fields">
                <label>
                  <span>Time</span>
                  <input
                    type="time"
                    value={reminderForm.time}
                    onChange={(e) => setReminderForm((prev) => ({ ...prev, time: e.target.value }))}
                  />
                </label>
                <label className="wide">
                  <span>Message</span>
                  <input
                    type="text"
                    placeholder="Meal, walk, workout, bedtime, weigh-in"
                    value={reminderForm.message}
                    onChange={(e) => setReminderForm((prev) => ({ ...prev, message: e.target.value }))}
                  />
                </label>
              </div>
              <div className="button-row">
                <button className="primary-button" type="submit">Add Reminder</button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={requestNotificationPermission}
                  disabled={notificationPermission === 'granted' || notificationPermission === 'unsupported'}
                >
                  {notificationPermission === 'granted' ? 'Notifications Ready' : 'Enable Browser Alerts'}
                </button>
              </div>
            </form>

            <div className="reminder-list">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="reminder-chip">
                  <div>
                    <strong>{reminder.time}</strong>
                    <p>{reminder.message}</p>
                  </div>
                  <button type="button" onClick={() => removeReminder(reminder.id)}>
                    Clear
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="panel ritual-panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">Legacy Rituals</span>
                <h2>기존 종 / 타이머 기능 유지</h2>
              </div>
              <Waves size={18} />
            </div>

            <div className="ritual-grid">
              <div className="gong-zone">
                <Gong onClick={handleGongClick} />
                <div className={`quote-console ${quoteVisible ? 'visible' : ''}`}>
                  <p>{currentQuote}</p>
                </div>
                <div className="gong-counter">
                  <span>Gong Hits</span>
                  <strong>{gongHits.length}</strong>
                </div>
              </div>

              <div className="timer-panel">
                <div className="timer-grid">
                  {TIMER_PRESETS.map((timer) => (
                    <TimerButton
                      key={timer.id}
                      timer={timer}
                      timestamp={timerStamps[timer.id]}
                      onClick={() => handleTimerClick(timer.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="telemetry-grid">
          <div className="panel telemetry-card">
            <div className="telemetry-icon cyan">
              <Flame size={18} />
            </div>
            <div>
              <span className="telemetry-label">Daily Intake</span>
              <strong>{profile.dailyIntakeCalories} kcal</strong>
            </div>
          </div>

          <div className="panel telemetry-card">
            <div className="telemetry-icon lime">
              <Utensils size={18} />
            </div>
            <div>
              <span className="telemetry-label">Protein Target</span>
              <strong>{profile.proteinTarget} g</strong>
            </div>
          </div>

          <div className="panel telemetry-card">
            <div className="telemetry-icon amber">
              <Target size={18} />
            </div>
            <div>
              <span className="telemetry-label">Closest Target Gap</span>
              <strong>{currentWeight ? `${(currentWeight - profile.targetWeight).toFixed(1)} kg` : '--'}</strong>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
