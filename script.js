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
const crabSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2 10 C2 5 18 5 18 10 V15 H2 Z" fill="#ff4757"/><path d="M2 8 L0 6 M18 8 L20 6" stroke="#ff4757" stroke-width="1"/><circle cx="7" cy="8" r="1" fill="white"/><circle cx="13" cy="8" r="1" fill="white"/><circle cx="7" cy="8" r="0.5" fill="black"/><circle cx="13" cy="8" r="0.5" fill="black"/></svg>`;
const hydroShotSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#00ffff"/><circle cx="5" cy="5" r="2" fill="#ffffff"/></svg>`;

const serpentHeadBaseImg = createImage(serpentHeadBaseSVG);
const planktonImg = createImage(planktonSVG);
const jellyfishImg = createImage(jellyfishSVG);
const coralImg = createImage(coralSVG);
const crabImg = createImage(crabSVG);
const hydroShotImg = createImage(hydroShotSVG);

// --- Audio Context ---
let audioCtx;
function playSound(type, freq, vol, duration) { if (!audioCtx) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.type = type; g.gain.setValueAtTime(vol, audioCtx.currentTime); o.frequency.setValueAtTime(freq, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration); o.start(); o.stop(audioCtx.currentTime + duration); }
function playEatSound() { playSound('sine', 600, 0.1, 0.2); }
function playGameOverSound() { playSound('sawtooth', 150, 0.15, 0.8); }
function playShootSound() { playSound('triangle', 800, 0.08, 0.15); }
function playHitSound() { playSound('square', 300, 0.1, 0.1); }

// --- Game State Variables ---
const box = 20;
const MAX_CRABS = 3;
let serpent, food, score, highScore, d, game, gameSpeed, animationFrame, corals, jellyfish, jellyfishTimeout, crabs, shots, shotCooldown;

// --- Game Logic ---
function setupGame() { highScore = localStorage.getItem('seaSerpentHighScore') || 0; highScoreEl.innerText = highScore; createBubbles(); }
function startGame() { startScreen.style.display = 'none'; gameView.style.display = 'flex'; init(); }

function init() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    serpent = [{ x: 9 * box, y: 10 * box }];
    score = 0;
    d = null;
    gameSpeed = 130;
    animationFrame = 0;
    currentScoreEl.innerText = score;
    if (jellyfishTimeout) clearTimeout(jellyfishTimeout);
    jellyfish = null;
    shots = [];
    shotCooldown = false;
    placeCorals();
    initCrabs();
    placeFood();
    gameOverScreen.style.display = 'none';
    if (game) clearInterval(game);
    game = setInterval(draw, gameSpeed);
}

function isPositionOccupied(x, y, checkSerpent = true) { if (checkSerpent) { for (let i = 0; i < serpent.length; i++) { if (x === serpent[i].x && y === serpent[i].y) return true; } } for (let i = 0; i < corals.length; i++) { if (x === corals[i].x && y === corals[i].y) return true; } return false; }
function placeFood() { do { food = { x: Math.floor(Math.random() * 20) * box, y: Math.floor(Math.random() * 20) * box }; } while (isPositionOccupied(food.x, food.y)); }
function placeCorals() { corals = []; const c = 4; for (let i = 0; i < c; i++) { let o; do { o = { x: Math.floor(Math.random() * 20) * box, y: Math.floor(Math.random() * 20) * box }; } while (isPositionOccupied(o.x, o.y, false) || (o.y > 8 * box && o.y < 12 * box)); corals.push(o); } }
function placeJellyfish() { do { jellyfish = { x: Math.floor(Math.random() * 20) * box, y: Math.floor(Math.random() * 20) * box }; } while (isPositionOccupied(jellyfish.x, jellyfish.y)); }

function initCrabs() {
    crabs = [];
    for (let i = 0; i < MAX_CRABS; i++) {
        addOneCrab();
    }
}

function addOneCrab() {
    if (crabs.length >= MAX_CRABS) return;
    const lanes = [4, 8, 15, 19];
    const occupiedLanes = crabs.map(c => c.y);
    let availableLanes = lanes.filter(l => !occupiedLanes.includes(l * box));
    if (availableLanes.length === 0) availableLanes = lanes;
    const y = availableLanes[Math.floor(Math.random() * availableLanes.length)] * box;
    const x = Math.random() > 0.5 ? 0 : canvas.width - box;
    crabs.push({ x, y, dir: x === 0 ? 1 : -1, speed: (Math.random() * 0.5 + 0.4) });
}

function handleKeyDown(e) {
    if (e.keyCode === 37 && d !== 'RIGHT') d = 'LEFT';
    else if (e.keyCode === 38 && d !== 'DOWN') d = 'UP';
    else if (e.keyCode === 39 && d !== 'LEFT') d = 'RIGHT';
    else if (e.keyCode === 40 && d !== 'UP') d = 'DOWN';
    else if (e.keyCode === 32 && !shotCooldown && d) {
        playShootSound();
        shots.push({ x: serpent[0].x + box / 4, y: serpent[0].y + box / 4, dir: d });
        shotCooldown = true;
        setTimeout(() => { shotCooldown = false; }, 500);
    }
}

function collision(h, a) { for (let i = 0; i < a.length; i++) { if (h.x === a[i].x && h.y === a[i].y) return true; } return false; }
function crabCollision(h, a) { for (let i = 0; i < a.length; i++) { const c = a[i]; if (h.y === c.y && h.x < c.x + box && h.x + box > c.x) return true; } return false; }
function updateGameSpeed(s) { clearInterval(game); gameSpeed = s; game = setInterval(draw, gameSpeed); }

function gameOver() { playGameOverSound(); clearInterval(game); gameOverScreen.style.display = 'flex'; finalScoreEl.innerText = score; if (score > highScore) { highScore = score; localStorage.setItem('seaSerpentHighScore', highScore); highScoreEl.innerText = highScore; } }

function draw() {
    animationFrame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw serpent & eyes
    for (let i = 1; i < serpent.length; i++) { ctx.fillStyle = `rgba(0, 255, 255, ${1 - i / serpent.length * 0.5})`; ctx.fillRect(serpent[i].x, serpent[i].y, box, box); }
    const headX = serpent[0].x, headY = serpent[0].y; ctx.drawImage(serpentHeadBaseImg, headX, headY, box, box);
    const eyeSize = box / 5; ctx.fillStyle = '#001f3f';
    switch (d) {
        case 'LEFT': ctx.fillRect(headX + box * 0.2, headY + box * 0.2, eyeSize, eyeSize); ctx.fillRect(headX + box * 0.2, headY + box * 0.6, eyeSize, eyeSize); break;
        case 'UP': ctx.fillRect(headX + box * 0.2, headY + box * 0.2, eyeSize, eyeSize); ctx.fillRect(headX + box * 0.6, headY + box * 0.2, eyeSize, eyeSize); break;
        case 'DOWN': ctx.fillRect(headX + box * 0.2, headY + box * 0.6, eyeSize, eyeSize); ctx.fillRect(headX + box * 0.6, headY + box * 0.6, eyeSize, eyeSize); break;
        case 'RIGHT': default: ctx.fillRect(headX + box * 0.6, headY + box * 0.2, eyeSize, eyeSize); ctx.fillRect(headX + box * 0.6, headY + box * 0.6, eyeSize, eyeSize); break;
    }

    // Draw items
    const pulse = Math.sin(animationFrame * 0.1) * 2; ctx.drawImage(planktonImg, food.x - pulse / 2, food.y - pulse / 2, box + pulse, box + pulse);
    corals.forEach(c => ctx.drawImage(coralImg, c.x, c.y, box, box));
    if (jellyfish) { const p = Math.sin(animationFrame * 0.08) * 3; ctx.globalAlpha = 0.8 + Math.sin(animationFrame * 0.08) * 0.2; ctx.drawImage(jellyfishImg, jellyfish.x, jellyfish.y, box, box); ctx.globalAlpha = 1.0; }

    // Draw and move crabs
    crabs.forEach(c => { c.x += c.dir * c.speed; if (c.x <= 0 || c.x >= canvas.width - box) c.dir *= -1; ctx.drawImage(crabImg, c.x, c.y, box, box); });

    // Draw and move shots
    for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        if (s.dir === 'LEFT') s.x -= 5; else if (s.dir === 'RIGHT') s.x += 5; else if (s.dir === 'UP') s.y -= 5; else if (s.dir === 'DOWN') s.y += 5;
        ctx.drawImage(hydroShotImg, s.x, s.y, box / 2, box / 2);
        if (s.x < 0 || s.x > canvas.width || s.y < 0 || s.y > canvas.height) shots.splice(i, 1);
    }

    // Collision Detection: Shots vs Crabs
    for (let i = shots.length - 1; i >= 0; i--) {
        for (let j = crabs.length - 1; j >= 0; j--) {
            if (shots[i] && crabs[j] && shots[i].x < crabs[j].x + box && shots[i].x + box / 2 > crabs[j].x && shots[i].y < crabs[j].y + box && shots[i].y + box / 2 > crabs[j].y) {
                playHitSound();
                score += 10;
                currentScoreEl.innerText = score;
                shots.splice(i, 1);
                crabs.splice(j, 1);
                setTimeout(addOneCrab, 3000); // Respawn a new crab after 3 seconds
                break;
            }
        }
    }

    if (!d) return;

    let serpentX = serpent[0].x, serpentY = serpent[0].y;
    if (d === 'LEFT') serpentX -= box; else if (d === 'UP') serpentY -= box; else if (d === 'RIGHT') serpentX += box; else if (d === 'DOWN') serpentY += box;

    let newHead = { x: serpentX, y: serpentY };

    if (serpentX === food.x && serpentY === food.y) { score++; playEatSound(); currentScoreEl.innerText = score; placeFood(); if (score > 0 && score % 5 === 0 && !jellyfish) placeJellyfish(); serpent.push({}); } else { serpent.pop(); }
    if (jellyfish && serpentX === jellyfish.x && serpentY === jellyfish.y) { playEatSound(); jellyfish = null; updateGameSpeed(gameSpeed + 60); jellyfishTimeout = setTimeout(() => { const baseSpeed = 130 - Math.floor(score / 2) * 5; updateGameSpeed(Math.max(50, baseSpeed)); }, 5000); }

    if (serpentX < 0 || serpentY < 0 || serpentX >= canvas.width || serpentY >= canvas.height || collision(newHead, serpent.slice(1)) || collision(newHead, corals) || crabCollision(newHead, crabs)) { gameOver(); return; }

    serpent.unshift(newHead);
}

function createBubbles() { const c = 20; for (let i = 0; i < c; i++) { const b = document.createElement('div'); b.className = 'bubble'; const s = Math.random() * 40 + 10 + 'px'; b.style.width = s; b.style.height = s; b.style.left = Math.random() * 100 + '%'; b.style.animationDuration = Math.random() * 8 + 5 + 's'; b.style.animationDelay = Math.random() * 5 + 's'; bubblesContainer.appendChild(b); } }

// --- Event Listeners ---
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', init);
document.addEventListener('keydown', handleKeyDown);

// --- Initial Setup ---
setupGame();