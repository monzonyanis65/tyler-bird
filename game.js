const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiOverlay = document.getElementById('ui-overlay');
const startMenu = document.getElementById('start-menu');
const gameOverMenu = document.getElementById('game-over-menu');
const scoreDisplay = document.getElementById('score-display');
const finalScoreSpan = document.getElementById('final-score');
const bestScoreSpan = document.getElementById('best-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game constants
const GRAVITY = 0.25;
const FLAP = -4.5;
const SPAWN_RATE = 120; // frames between towers
const PIPE_WIDTH = 60;
const PIPE_GAP = 160;
const BIRD_HEIGHT = 60;
const BIRD_WIDTH = 50;

// Game state
let bird = { x: 50, y: 300, velocity: 0, width: BIRD_WIDTH, height: BIRD_HEIGHT, rotation: 0 };
let pipes = [];
let frameCount = 0;
let score = 0;
let bestScore = localStorage.getItem('tylerBirdBestScore') || 0;
let gameState = 'MENU'; // MENU, PLAYING, GAME_OVER

// Utility to remove background and auto-crop sprites to their content
function processImage(img, callback) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0);
    
    const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;
    
    // 1. Remove white background and find bounding box of content
    let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
    let foundContent = false;

    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const i = (y * img.width + x) * 4;
            const isWhite = data[i] > 240 && data[i+1] > 240 && data[i+2] > 240;
            
            if (isWhite) {
                data[i+3] = 0; // Make white transparent
            }

            if (data[i+3] > 0) { // If pixel is not transparent
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
                foundContent = true;
            }
        }
    }

    // 2. Put processed data (with transparency) back to temp canvas
    tempCtx.putImageData(imageData, 0, 0);

    // 3. Extract the cropped sprite
    if (!foundContent) { minX = 0; minY = 0; maxX = img.width; maxY = img.height; }
    
    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;

    const pCanvas = document.createElement('canvas');
    pCanvas.width = cropWidth;
    pCanvas.height = cropHeight;
    const pCtx = pCanvas.getContext('2d');
    
    // Draw only the cropped area
    pCtx.drawImage(tempCanvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    
    callback(pCanvas);
}

// Load assets
const birdImg = new Image();
birdImg.src = 'assets/bird.png';
let birdCanvas = null;
birdImg.onload = () => processImage(birdImg, (canvas) => {
    birdCanvas = canvas;
    bird.width = BIRD_WIDTH;
    bird.height = BIRD_HEIGHT;
});

const bishopImg = new Image();
bishopImg.src = 'assets/bird_bishop.png';
let bishopCanvas = null;
bishopImg.onload = () => processImage(bishopImg, (canvas) => {
    bishopCanvas = canvas;
});

const pipeImg = new Image();
pipeImg.src = 'assets/tower.png';
const bgImg = new Image();
bgImg.src = 'assets/background.png';

// Audio assets
const gameOverSound = new Audio('assets/game_over.mp3');

function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Controls
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') handleAction();
    });
    canvas.addEventListener('mousedown', handleAction);
    
    startBtn.onclick = startGame;
    restartBtn.onclick = startGame;

    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

function handleAction() {
    if (gameState === 'PLAYING') {
        bird.velocity = FLAP;
    } else if (gameState === 'MENU' || gameState === 'GAME_OVER') {
        // Handled by buttons, but fallback for space
        if (gameState === 'GAME_OVER') startGame();
    }
}

function startGame() {
    bird.x = 50;
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    bird.rotation = 0;
    pipes = [];
    score = 0;
    frameCount = 0;
    gameState = 'PLAYING';
    
    startMenu.classList.add('hidden');
    gameOverMenu.classList.add('hidden');
    scoreDisplay.classList.remove('hidden');
    scoreDisplay.innerText = '0';
    
    // Stop game over music if it's playing
    gameOverSound.pause();
    gameOverSound.currentTime = 0;
}

function gameOver() {
    gameState = 'GAME_OVER';
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('tylerBirdBestScore', bestScore);
    }
    finalScoreSpan.innerText = score;
    bestScoreSpan.innerText = bestScore;
    gameOverMenu.classList.remove('hidden');
    scoreDisplay.classList.add('hidden');
    
    // Play game over music
    gameOverSound.play();
}

function update() {
    if (gameState !== 'PLAYING') return;

    frameCount++;

    // Bird physics
    bird.velocity += GRAVITY;
    bird.y += bird.velocity;
    
    // Rotation based on velocity
    bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, bird.velocity / 10));

    // Ground/Ceiling collision
    if (bird.y + bird.height > canvas.height || bird.y < 0) {
        gameOver();
    }

    // Pipe generation
    if (frameCount % SPAWN_RATE === 0) {
        const gapY = Math.random() * (canvas.height - PIPE_GAP - 100) + 50;
        pipes.push({
            x: canvas.width,
            gapY: gapY,
            passed: false
        });
    }

    // Pipe movement and collision
    pipes.forEach((pipe, index) => {
        pipe.x -= 2.5;

        // Collision detection
        if (
            bird.x < pipe.x + PIPE_WIDTH &&
            bird.x + bird.width > pipe.x &&
            (bird.y < pipe.gapY || bird.y + bird.height > pipe.gapY + PIPE_GAP)
        ) {
            gameOver();
        }

        // Score tracking
        if (!pipe.passed && bird.x > pipe.x + PIPE_WIDTH) {
            score++;
            pipe.passed = true;
            scoreDisplay.innerText = score;
        }

        // Remove old pipes
        if (pipe.x < -PIPE_WIDTH) {
            pipes.splice(index, 1);
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background
    if (bgImg.complete) {
        // Draw background tiled or stretched
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw Pipes (Dema Towers)
    pipes.forEach(pipe => {
        if (pipeImg.complete) {
            // Upper Tower (Upside down)
            ctx.save();
            ctx.translate(pipe.x + PIPE_WIDTH / 2, pipe.gapY);
            ctx.scale(1, -1);
            ctx.drawImage(pipeImg, -PIPE_WIDTH / 2, 0, PIPE_WIDTH, canvas.height);
            ctx.restore();

            // Lower Tower
            ctx.drawImage(pipeImg, pipe.x, pipe.gapY + PIPE_GAP, PIPE_WIDTH, canvas.height);
        } else {
            ctx.fillStyle = '#333';
            ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY);
            ctx.fillRect(pipe.x, pipe.gapY + PIPE_GAP, PIPE_WIDTH, canvas.height);
        }
    });

    // Calculate Bishop transformation based on proximity to the actual tower structure
    let bishopOpacity = 0;
    if (gameState === 'PLAYING') {
        pipes.forEach(pipe => {
            // 1. Horizontal distance to the pipe's X range
            let distToX = 0;
            if (bird.x + bird.width < pipe.x) {
                distToX = pipe.x - (bird.x + bird.width);
            } else if (bird.x > pipe.x + PIPE_WIDTH) {
                distToX = bird.x - (pipe.x + PIPE_WIDTH);
            }
            
            // 2. Vertical distance to the nearest solid part of the tower
            let distToY = 0;
            if (bird.y + bird.height < pipe.gapY) {
                // Bird is above the gap (close to top pipe)
                distToY = pipe.gapY - (bird.y + bird.height);
            } else if (bird.y > pipe.gapY + PIPE_GAP) {
                // Bird is below the gap (close to bottom pipe)
                distToY = bird.y - (pipe.gapY + PIPE_GAP);
            } else {
                // Bird is INSIDE the gap vertically
                const distToTop = bird.y - pipe.gapY;
                const distToBottom = (pipe.gapY + PIPE_GAP) - (bird.y + bird.height);
                distToY = Math.min(distToTop, distToBottom);
            }
            
            // 3. Actual shortest distance to the nearest solid part
            // If distToX is 0, we are horizontally aligned with the pipe
            const actualDist = (distToX === 0) ? distToY : Math.sqrt(distToX * distToX + distToY * distToY);

            const threshold = 30; // Transformation threshold (very close)
            if (actualDist < threshold) {
                const op = 1 - (actualDist / threshold);
                bishopOpacity = Math.max(bishopOpacity, op);
            }
        });
    } else if (gameState === 'GAME_OVER') {
        bishopOpacity = 1; // Fully Bishop when caught
    }

    // Draw Bird (Tyler Bird / Bishop)
    ctx.save();
    ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    ctx.rotate(bird.rotation);
    
    // Draw normal bird with inverse opacity
    if (birdCanvas) {
        ctx.save();
        ctx.globalAlpha = 1 - bishopOpacity;
        ctx.drawImage(birdCanvas, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
        ctx.restore();
    }

    // Draw bishop bird on top with current opacity
    if (bishopCanvas) {
        ctx.save();
        ctx.globalAlpha = bishopOpacity;
        ctx.drawImage(bishopCanvas, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
        ctx.restore();
    } else if (!birdCanvas) {
        // Fallback if no images are loaded
        ctx.fillStyle = bishopOpacity > 0.5 ? '#E21406' : '#FCE300';
        ctx.fillRect(-bird.width / 2, -bird.height / 2, bird.width, bird.height);
    }
    ctx.restore();
}

let lastTime = 0;
const FPS = 60;
const frameInterval = 1000 / FPS;

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    
    const elapsed = timestamp - lastTime;

    if (elapsed > frameInterval) {
        // Adjust lastTime to account for the frame interval
        lastTime = timestamp - (elapsed % frameInterval);
        
        update();
        draw();
    }
    
    requestAnimationFrame(gameLoop);
}

init();
