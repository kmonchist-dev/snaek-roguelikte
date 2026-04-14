/* Save this file as game.js */

// --- 1. GAME STATE MANAGER ---
// This acts like React's gameState. It controls which screen is visible.
let currentGameState = 'MENU'; // Possible: MENU, PLAYING, SHOP, CLASS_SELECT, GAMEOVER

// --- 2. GAME SETUP & CANVAS ---
// We locate the "Skeleton" bits in HTML
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// We use the same math from your React game
const GRID_SIZE = 20; 
const CELL_SIZE = 20; // 20px * 20 grids = 400px canvas
const CANVAS_SIZE = 400; // Match HTML canvas width/height

// --- 3. RUN VARIABLES (What changes during a run) ---
let stage = 1;
let hp = 3;
let maxHp = 3;
let gold = 0;
let foodEaten = 0;
const FOOD_TO_ADVANCE = 7; // Simplify for now

let speed = 150; // Delay in milliseconds (lower is faster)

// --- 4. ENGINE REFERENCE (Game loop) ---
let gameLoopInterval = null; 

// --- 5. GAME OBJECTS ---
let snake = [ { x: 10, y: 10 } ]; // Just the head to start
let direction = { x: 0, y: -1 }; // Start moving UP
let nextDirection = { x: 0, y: -1 }; // For smoother turning
let food = { x: 15, y: 10 }; // Spawn single initial food


// --- 6. CORE ENGINE FUNCTION (The Loop) ---
// This runs many times a second, recalculating the whole game state.
function update() {
    // 6a. Turn smoothly
    direction = nextDirection;

    // 6b. Move the Head
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    snake.unshift(head); // Add new head to start of snake array

    // 6c. Check if Head is on Food
    if (head.x === food.x && head.y === food.y) {
        // EAT!
        foodEaten++;
        gold += 5;
        
        // Spawn new food (simplified: doesn't check for snake yet)
        food = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
        
        // Check for stage win
        if (foodEaten >= FOOD_TO_ADVANCE) {
            winStage();
        }
    } else {
        // Did not eat food, remove the tail so we stay the same length
        snake.pop(); 
    }

    // 6d. Check Collision (Wall)
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        loseHp();
        return; // Stop processing this loop
    }

    // 6e. Check Collision (Self)
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            loseHp();
            return;
        }
    }

    // 6f. Refresh the screen ( skin )
    draw(); 
    // 6g. Update the UI stats
    updateUi();
}


// --- 7. RENDER FUNCTIONS (Draw on Canvas) ---
// This is the "artist" that draws the rectangles on the canvas.
function draw() {
    // Clear the board
    ctx.fillStyle = '#020617'; // Canvas background color
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid lines
    ctx.strokeStyle = '#1e293b'; // Slate blue grid
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath(); ctx.moveTo(i * CELL_SIZE, 0); ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * CELL_SIZE); ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE); ctx.stroke();
    }

    // Draw Food
    ctx.fillStyle = '#ef4444'; // Red food
    ctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

    // Draw Snake
    ctx.fillStyle = '#22c55e'; // Green snake
    snake.forEach(segment => {
        ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
}


// --- 8. STATE FLOW & UI FUNCTIONS ---

// Update the text in the right panel
function updateUi() {
    document.getElementById('statStage').textContent = stage;
    document.getElementById('statHp').textContent = `${hp} / ${maxHp}`;
    document.getElementById('statGold').textContent = gold;
    document.getElementById('statFood').textContent = `${foodEaten} / ${FOOD_TO_ADVANCE}`;
}

// Show/Hide overlays using "skin" (CSS active class)
function setScreen(screenName) {
    // Hide ALL screens first
    const screens = document.querySelectorAll('.overlay');
    screens.forEach(s => s.classList.remove('active'));

    // If a screen should be shown, activate it
    if (screenName) {
        document.getElementById(`${screenName}Screen`).classList.add('active');
    }
}

// Abandon Run / Quit
function quitRun() {
    clearInterval(gameLoopInterval); // STOP THE ENGINE
    setScreen('menu'); // SHOW MENU SCREEN
}

// Game over logic
function loseHp() {
    hp--;
    updateUi();
    clearInterval(gameLoopInterval); // Pause the game loop

    if (hp <= 0) {
        // RUN OVER
        setScreen('gameover');
    } else {
        // Flash red screen, respawn, whatever
        resetGamePosition();
        startGameLoop(); // Continue!
    }
}

// Win stage logic
function winStage() {
    clearInterval(gameLoopInterval); // PAUSE ENGINE
    // This is where you would show the shop, select class, etc.
    alert(`Stage ${stage} Cleared! (Normally the Shop would appear here)`);
    
    stage++;
    resetGamePosition();
    startGameLoop(); // Start next stage immediately for this simple version
}


// --- 9. HELPERS ---

function resetGamePosition() {
    snake = [ { x: 10, y: 10 } ];
    direction = { x: 0, y: -1 };
    nextDirection = direction;
    foodEaten = 0;
}

// Reset everything for a clean new run
function startNewRun() {
    stage = 1;
    hp = 3;
    maxHp = 3;
    gold = 0;
    resetGamePosition();
    updateUi();
    setScreen(null); // Hide all screens (Playing screen doesn't have an overlay)
    startGameLoop(); // TURN ON THE ENGINE
}

// This connects the 'interval' to the 'update' brain function
function startGameLoop() {
    clearInterval(gameLoopInterval); // Make sure only ONE loop runs
    gameLoopInterval = setInterval(update, speed); // RUN Update function every 'speed' millisecs
}


// --- 10. INPUTS & BUTTONS ---

// WASD or Arrows to change nextDirection brain variable
document.addEventListener('keydown', e => {
    // Stop snake from doing an instant 180 (killing itself)
    switch(e.key) {
        case 'ArrowUp': case 'w': 
            if (direction.y === 0) nextDirection = {x: 0, y: -1}; break;
        case 'ArrowDown': case 's': 
            if (direction.y === 0) nextDirection = {x: 0, y: 1}; break;
        case 'ArrowLeft': case 'a': 
            if (direction.x === 0) nextDirection = {x: -1, y: 0}; break;
        case 'ArrowRight': case 'd': 
            if (direction.x === 0) nextDirection = {x: 1, y: 0}; break;
    }
});

// Connect HTML buttons to our JS functions
document.getElementById('startRunBtn').onclick = startNewRun;
document.getElementById('restartBtn').onclick = startNewRun;
document.getElementById('quitBtn').onclick = quitRun;