const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Screen Elements ---
const startScreen = document.getElementById('start-screen');
const gameView = document.getElementById('game-view');
const gameOverScreen = document.getElementById('game-over-screen');

// --- Button Elements ---
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');

// --- Display Elements ---
const currentScoreEl = document.getElementById('current-score');
const highScoreEl = document.getElementById('high-score');
const finalScoreEl = document.getElementById('final-score');
const bubblesContainer = document.querySelector('.bubbles');

// --- SVG Image Generation ---
const createImage = (svg) => {
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(svg);
    return img;
};

const serpentHeadBaseSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M10 2 C15 2 18 5 18 10 S15 18 10 18 S2 15 2 10 S5 2 10 2 Z" fill="#00ffff"/></svg>`;
const planktonSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="5" fill="#ffcc00"/><circle cx="10" cy="10" r="7" fill="rgba(255,204,0,0.5)"/></svg>`;
const jellyfishSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M3 10 C3 5 17 5 17 10 Q15 15 10 15 Q5 15 3 10 Z" fill="rgba(255, 105, 180, 0.8)"/><path d="M5 14 Q6 18 7 14" stroke="rgba(255, 105, 180, 0.8)" stroke-width="1" fill="none"/><path d="M10 14 Q10 18 10 14" stroke="rgba(255, 105, 180, 0.8)" stroke-width="1" fill="none"/><path d="M15 14 Q14 18 13 14" stroke="rgba(255, 105, 180, 0.8)" stroke-width="1" fill="none"/></svg>`;
const coralSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M10 20 V15 M10 15 C5 15 5 10 10 10 M10 15 C15 15 15 10 10 10 M10 10 C5 10 5 5 10 5 M10 5 C15 5 15 10 10 10" stroke="#ff7f50" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;

const serpentHeadBaseImg = createImage(serpentHeadBaseSVG);
const planktonImg = createImage(planktonSVG);
const jellyfishImg = createImage(jellyfishSVG);
const coralImg = createImage(coralSVG);

// --- Audio Context ---
let audioCtx;
function playEatSound() { if (!audioCtx) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.type = 'sine'; g.gain.setValueAtTime(0.1, audioCtx.currentTime); o.frequency.setValueAtTime(600, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2); o.start(); o.stop(audioCtx.currentTime + 0.2); }
function playGameOverSound() { if (!audioCtx) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.type = 'sawtooth'; g.gain.setValueAtTime(0.15, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8); o.frequency.setValueAtTime(150, audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.8); o.start(); o.stop(audioCtx.currentTime + 0.8); }

// --- Game State Variables ---
const box = 20;
let serpent, food, score, highScore, d, game, gameSpeed, animationFrame, corals, jellyfish, jellyfishTimeout;

// --- Game Logic ---
function setupGame() {
    highScore = localStorage.getItem('seaSerpentHighScore') || 0;
    highScoreEl.innerText = highScore;
    createBubbles();
}

function startGame() {
    startScreen.style.display = 'none';
    gameView.style.display = 'flex';
    init();
}

function init() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    serpent = [{ x: 9 * box, y: 10 * box }];
    score = 0;
    d = null;
    gameSpeed = 130;
    animationFrame = 0;
    currentScoreEl.innerText = score;

    if (jellyfishTimeout) clearTimeout(jellyfishTimeout);
    jellyfish = null;

    placeCorals();
    placeFood();

    gameOverScreen.style.display = 'none';

    if (game) clearInterval(game);
    game = setInterval(draw, gameSpeed);
}

function isPositionOccupied(x, y, checkSerpent = true) { if (checkSerpent) { for (let i = 0; i < serpent.length; i++) { if (x === serpent[i].x && y === serpent[i].y) return true; } } for (let i = 0; i < corals.length; i++) { if (x === corals[i].x && y === corals[i].y) return true; } return false; }
function placeFood() { do { food = { x: Math.floor(Math.random() * 20) * box, y: Math.floor(Math.random() * 20) * box }; } while (isPositionOccupied(food.x, food.y)); }
function placeCorals() { corals = []; const c = 5; for (let i = 0; i < c; i++) { let o; do { o = { x: Math.floor(Math.random() * 20) * box, y: Math.floor(Math.random() * 20) * box }; } while (isPositionOccupied(o.x, o.y, false) || (o.x > 6 * box && o.x < 14 * box)); corals.push(o); } }
function placeJellyfish() { do { jellyfish = { x: Math.floor(Math.random() * 20) * box, y: Math.floor(Math.random() * 20) * box }; } while (isPositionOccupied(jellyfish.x, jellyfish.y)); }
function direction(e) { if (e.keyCode === 37 && d !== 'RIGHT') d = 'LEFT'; else if (e.keyCode === 38 && d !== 'DOWN') d = 'UP'; else if (e.keyCode === 39 && d !== 'LEFT') d = 'RIGHT'; else if (e.keyCode === 40 && d !== 'UP') d = 'DOWN'; }
function collision(h, a) { for (let i = 0; i < a.length; i++) { if (h.x === a[i].x && h.y === a[i].y) return true; } return false; }
function updateGameSpeed(s) { clearInterval(game); gameSpeed = s; game = setInterval(draw, gameSpeed); }

function gameOver() {
    playGameOverSound();
    clearInterval(game);
    gameOverScreen.style.display = 'flex';
    finalScoreEl.innerText = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('seaSerpentHighScore', highScore);
        highScoreEl.innerText = highScore;
    }
}

function draw() {
    animationFrame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw serpent body
    for (let i = 1; i < serpent.length; i++) {
        ctx.fillStyle = `rgba(0, 255, 255, ${1 - i / serpent.length * 0.5})`;
        ctx.fillRect(serpent[i].x, serpent[i].y, box, box);
    }
    
    const headX = serpent[0].x;
    const headY = serpent[0].y;
    ctx.drawImage(serpentHeadBaseImg, headX, headY, box, box);

    const eyeSize = box / 5;
    ctx.fillStyle = '#001f3f'; // Eye color
    switch (d) {
        case 'LEFT':
            ctx.fillRect(headX + box * 0.2, headY + box * 0.2, eyeSize, eyeSize);
            ctx.fillRect(headX + box * 0.2, headY + box * 0.6, eyeSize, eyeSize);
            break;
        case 'UP':
            ctx.fillRect(headX + box * 0.2, headY + box * 0.2, eyeSize, eyeSize);
            ctx.fillRect(headX + box * 0.6, headY + box * 0.2, eyeSize, eyeSize);
            break;
        case 'DOWN':
            ctx.fillRect(headX + box * 0.2, headY + box * 0.6, eyeSize, eyeSize);
            ctx.fillRect(headX + box * 0.6, headY + box * 0.6, eyeSize, eyeSize);
            break;
        case 'RIGHT':
        default:
            ctx.fillRect(headX + box * 0.6, headY + box * 0.2, eyeSize, eyeSize);
            ctx.fillRect(headX + box * 0.6, headY + box * 0.6, eyeSize, eyeSize);
            break;
    }

    const pulse = Math.sin(animationFrame * 0.1) * 2;
    ctx.drawImage(planktonImg, food.x - pulse / 2, food.y - pulse / 2, box + pulse, box + pulse);
    corals.forEach(c => ctx.drawImage(coralImg, c.x, c.y, box, box));
    if (jellyfish) { const p = Math.sin(animationFrame * 0.08) * 3; ctx.globalAlpha = 0.8 + Math.sin(animationFrame * 0.08) * 0.2; ctx.drawImage(jellyfishImg, jellyfish.x, jellyfish.y, box, box); ctx.globalAlpha = 1.0; }

    if (!d) return;

    let serpentX = serpent[0].x;
    let serpentY = serpent[0].y;

    if (d === 'LEFT') serpentX -= box;
    if (d === 'UP') serpentY -= box;
    if (d === 'RIGHT') serpentX += box;
    if (d === 'DOWN') serpentY += box;

    let newHead = { x: serpentX, y: serpentY };

    if (serpentX === food.x && serpentY === food.y) {
        score++;
        playEatSound();
        currentScoreEl.innerText = score;
        placeFood();
        if (score > 0 && score % 5 === 0 && !jellyfish) {
            placeJellyfish();
        }
        // Don't pop the tail, so the serpent grows
    } else {
        serpent.pop(); // Pop the tail if we didn't eat
    }

    if (jellyfish && serpentX === jellyfish.x && serpentY === jellyfish.y) {
        playEatSound();
        jellyfish = null;
        updateGameSpeed(gameSpeed + 60);
        jellyfishTimeout = setTimeout(() => {
            const baseSpeed = 130 - Math.floor(score / 2) * 5;
            updateGameSpeed(Math.max(50, baseSpeed));
        }, 5000);
    }

    if (serpentX < 0 || serpentY < 0 || serpentX >= canvas.width || serpentY >= canvas.height || collision(newHead, serpent) || collision(newHead, corals)) {
        gameOver();
        return;
    }

    serpent.unshift(newHead);
}

// --- Bubble Creation ---
function createBubbles() {
    const bubbleCount = 20;
    for (let i = 0; i < bubbleCount; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        const size = Math.random() * 40 + 10 + 'px';
        bubble.style.width = size;
        bubble.style.height = size;
        bubble.style.left = Math.random() * 100 + '%';
        bubble.style.animationDuration = Math.random() * 8 + 5 + 's';
        bubble.style.animationDelay = Math.random() * 5 + 's';
        bubblesContainer.appendChild(bubble);
    }
}

// --- Event Listeners ---
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', init);
document.addEventListener('keydown', direction);

// --- Initial Setup ---
setupGame();