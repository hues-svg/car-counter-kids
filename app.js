const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');

const playBtn = document.getElementById('play-btn');
const checkBtn = document.getElementById('check-btn');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');

const carsArea = document.getElementById('cars-area');
const answerInput = document.getElementById('answer-input');
const messageEl = document.getElementById('message');

const roundValue = document.getElementById('round-value');
const scoreValue = document.getElementById('score-value');
const timeValue = document.getElementById('time-value');
const bestValue = document.getElementById('best-value');

const BEST_KEY = 'carCounterBestScore';
const config = {
  minCars: 3,
  startMaxCars: 18,
  maxCarsCap: 60,
  maxCarsIncrement: 2,
  startTime: 14,
  minTime: 6,
  timeDecrement: 1,
};

const state = {
  round: 1,
  score: 0,
  best: Number(localStorage.getItem(BEST_KEY)) || 0,
  currentCars: 0,
  maxCarsForRound: config.startMaxCars,
  timeLimitForRound: config.startTime,
  timeLeft: config.startTime,
  timerId: null,
  checked: false,
};

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function showScreen(screen) {
  const showMenu = screen === 'menu';

  menuScreen.classList.toggle('active', showMenu);
  gameScreen.classList.toggle('active', !showMenu);

  menuScreen.setAttribute('aria-hidden', String(!showMenu));
  gameScreen.setAttribute('aria-hidden', String(showMenu));
}

function updateHud() {
  roundValue.textContent = String(state.round);
  scoreValue.textContent = String(state.score);
  bestValue.textContent = String(state.best);
  timeValue.textContent = String(state.timeLeft);

  timeValue.classList.remove('warn', 'panic');
  if (state.timeLeft <= 3) {
    timeValue.classList.add('panic');
  } else if (state.timeLeft <= 6) {
    timeValue.classList.add('warn');
  }
}

function setMessage(text = '', kind = '') {
  messageEl.textContent = text;
  messageEl.classList.remove('ok', 'bad');
  if (kind) {
    messageEl.classList.add(kind);
  }
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function playTone({ frequency, duration, type = 'sine', volume = 0.05, delay = 0 }) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime + delay;

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playCorrectSound() {
  playTone({ frequency: 950, duration: 0.12, type: 'triangle', volume: 0.08 });
  playTone({ frequency: 1280, duration: 0.14, type: 'triangle', volume: 0.08, delay: 0.16 });
}

function playWrongSound() {
  playTone({ frequency: 220, duration: 0.3, type: 'sawtooth', volume: 0.07 });
}

function playTimeoutSound() {
  playTone({ frequency: 330, duration: 0.12, type: 'square', volume: 0.06 });
  playTone({ frequency: 220, duration: 0.2, type: 'square', volume: 0.07, delay: 0.12 });
}

function renderCars(count) {
  carsArea.innerHTML = '';

  for (let i = 0; i < count; i += 1) {
    const car = document.createElement('span');
    car.className = 'car';
    car.textContent = '🚗';
    car.style.animationDelay = `${(i % 10) * 0.05}s, ${(i % 7) * 0.15}s`;
    carsArea.appendChild(car);
  }
}

function startTimer() {
  stopTimer();
  state.timeLeft = state.timeLimitForRound;
  updateHud();

  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    updateHud();

    if (state.timeLeft <= 0) {
      stopTimer();
      onTimeout();
    }
  }, 1000);
}

function setBestIfNeeded() {
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(BEST_KEY, String(state.best));
  }
}

function lockRoundAfterAnswer() {
  state.checked = true;
  checkBtn.disabled = true;
  nextBtn.disabled = false;
  answerInput.disabled = true;
}

function prepareRoundDifficulty() {
  state.maxCarsForRound = Math.min(
    config.startMaxCars + (state.round - 1) * config.maxCarsIncrement,
    config.maxCarsCap,
  );

  state.timeLimitForRound = Math.max(
    config.startTime - (state.round - 1) * config.timeDecrement,
    config.minTime,
  );
}

function startRound() {
  state.checked = false;
  checkBtn.disabled = false;
  nextBtn.disabled = true;
  answerInput.disabled = false;
  answerInput.value = '';
  answerInput.focus();
  setMessage('');

  prepareRoundDifficulty();
  state.currentCars =
    Math.floor(Math.random() * (state.maxCarsForRound - config.minCars + 1)) + config.minCars;

  renderCars(state.currentCars);
  startTimer();
  updateHud();
}

function submitAnswer() {
  if (state.checked) return;

  const userValue = Number(answerInput.value);
  if (!Number.isInteger(userValue) || userValue < 0) {
    setMessage('Wpisz poprawną liczbę całkowitą.', 'bad');
    return;
  }

  stopTimer();

  if (userValue === state.currentCars) {
    state.score += 1;
    setBestIfNeeded();
    setMessage('Świetnie! Poprawna odpowiedź ✅', 'ok');
    playCorrectSound();
  } else {
    setMessage(`Niestety! Poprawna liczba aut to ${state.currentCars}.`, 'bad');
    playWrongSound();
  }

  lockRoundAfterAnswer();
  updateHud();
}

function onTimeout() {
  if (state.checked) return;

  setMessage(`Czas minął! Poprawna liczba aut to ${state.currentCars}.`, 'bad');
  playTimeoutSound();
  lockRoundAfterAnswer();
}

function nextRound() {
  state.round += 1;
  startRound();
}

function resetGame() {
  stopTimer();
  state.round = 1;
  state.score = 0;
  startRound();
}

function goToMenu() {
  stopTimer();
  showScreen('menu');
}

function startGameFromMenu() {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  state.round = 1;
  state.score = 0;
  updateHud();
  showScreen('game');
  startRound();
}

playBtn.addEventListener('click', startGameFromMenu);
checkBtn.addEventListener('click', submitAnswer);
nextBtn.addEventListener('click', nextRound);
restartBtn.addEventListener('click', resetGame);
menuBtn.addEventListener('click', goToMenu);

answerInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    submitAnswer();
  }
});

updateHud();
showScreen('menu');
