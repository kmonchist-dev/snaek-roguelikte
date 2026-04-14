const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const GRID_SIZE = 20; const CELL_SIZE = 20; const CANVAS_SIZE = 400;

// --- ROGUELITE DATA ---
const CLASSES = {
    PYTHON: { id: 'PYTHON', name: 'Python', desc: 'Balanced starter.', baseHp: 3, baseSpeed: 120, ghost: false, goldMult: 1, growth: 1, color: '#22c55e' },
    GHOST: { id: 'GHOST', name: 'Ghost', desc: 'Wraps walls. Fragile.', baseHp: 1, baseSpeed: 120, ghost: true, goldMult: 1, growth: 2, color: '#c084fc' },
    VIPER: { id: 'VIPER', name: 'Viper', desc: 'Fast, x2 Gold. Squishy.', baseHp: 2, baseSpeed: 80, ghost: false, goldMult: 2, growth: 1, color: '#60a5fa' },
    MERCHANT: { id: 'MERCHANT', name: 'Merchant', desc: 'Starts with 50 gold.', baseHp: 3, baseSpeed: 120, ghost: false, goldMult: 1, growth: 1, color: '#fbbf24' }
};

const MODIFIERS = {
    ROCKS: { name: 'Rocks', desc: 'Obstacles spawn.', max: 10 },
    SPOILED: { name: 'Spoiled Apples', desc: 'Poison food spawns.', max: Infinity },
    ICE: { name: 'Ice Patches', desc: 'Slide without turning.', max: 10 }
};

// --- RUN STATE ---
let gameState = 'MENU'; // MENU, CLASS_SELECT, PLAYING, SHOP, GAMEOVER
let playerClass = CLASSES.PYTHON;
let stage = 1, hp = 3, maxHp = 3, gold = 0, foodEaten = 0, speed = 120, foodValue = 1;
let activeMods = {}, lastMod = null;
let gameLoop = null;

// --- BOARD STATE ---
let snake = [{x: 10, y: 10}, {x: 10, y: 11}], dir = {x: 0, y: -1}, nextDir = {x: 0, y: -1};
let foods = [], rocks = [], ice = [], spoiled = [], growthQueue = 0;

function getFoodReq() { return 5 + (stage * 2); }

// --- ENGINE ---
function getEmptySpot() {
    let spot; let occupied = true;
    while(occupied) {
        spot = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
        occupied = snake.some(s=>s.x===spot.x && s.y===spot.y) || 
                   rocks.some(r=>r.x===spot.x && r.y===spot.y) || 
                   foods.some(f=>f.x===spot.x && f.y===spot.y) ||
                   spoiled.some(s=>s.x===spot.x && s.y===spot.y);
    }
    return spot;
}

function generateBoard() {
    rocks = []; ice = []; spoiled = []; foods = [getEmptySpot()];
    if (activeMods.ROCKS) {
        for(let i=0; i<activeMods.ROCKS * 3; i++) rocks.push(getEmptySpot());
    }
    if (activeMods.SPOILED) {
        for(let i=0; i<activeMods.SPOILED; i++) spoiled.push(getEmptySpot());
    }
    // Simplification for ice: treating them as single tiles for vanilla JS ease
    if (activeMods.ICE) {
        for(let i=0; i<activeMods.ICE * 2; i++) ice.push(getEmptySpot());
    }
}

function resetPosition() {
    snake = [{x: 10, y: 10}, {x: 10, y: 11}];
    dir = {x: 0, y: -1}; nextDir = {x: 0, y: -1};
    growthQueue = 0;
    generateBoard();
}

function update() {
    if(gameState !== 'PLAYING') return;

    const head = snake[0];
    const onIce = ice.some(i => i.x === head.x && i.y === head.y);
    if (!onIce) dir = nextDir; // Cannot turn on ice
    
    let newHead = { x: head.x + dir.x, y: head.y + dir.y };
    let hitWall = newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE;

    // Ghost passive
    if (hitWall && playerClass.ghost) {
        newHead.x = (newHead.x + GRID_SIZE) % GRID_SIZE;
        newHead.y = (newHead.y + GRID_SIZE) % GRID_SIZE;
        hitWall = false;
    }

    let hitSelf = snake.some(s => s.x === newHead.x && s.y === newHead.y);
    let hitRock = rocks.some(r => r.x === newHead.x && r.y === newHead.y);
    let hitSpoiled = spoiled.some(s => s.x === newHead.x && s.y === newHead.y);

    if (hitWall || hitSelf || (hitRock && !playerClass.ghost) || hitSpoiled) {
        takeDamage();
        return;
    }

    snake.unshift(newHead);

    let ateFoodIndex = foods.findIndex(f => f.x === newHead.x && f.y === newHead.y);
    if (ateFoodIndex !== -1) {
        foods.splice(ateFoodIndex, 1);
        gold += (foodValue * playerClass.goldMult);
        foodEaten++;
        growthQueue += playerClass.growth;
        
        if (foodEaten >= getFoodReq()) {
            winStage();
            return;
        }
        foods.push(getEmptySpot());
    }

    if (growthQueue > 0) {
        growthQueue--;
    } else {
        snake.pop();
    }

    draw();
    updateUI();
}

function draw() {
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    ctx.fillStyle = 'rgba(165, 243, 252, 0.2)'; // Ice
    ice.forEach(i => ctx.fillRect(i.x*CELL_SIZE, i.y*CELL_SIZE, CELL_SIZE, CELL_SIZE));
    
    ctx.fillStyle = '#475569'; // Rocks
    rocks.forEach(r => {
        ctx.beginPath(); ctx.roundRect(r.x*CELL_SIZE+1, r.y*CELL_SIZE+1, CELL_SIZE-2, CELL_SIZE-2, 4); ctx.fill();
    });

    ctx.fillStyle = '#84cc16'; // Spoiled
    spoiled.forEach(s => {
        ctx.beginPath(); ctx.arc(s.x*CELL_SIZE+10, s.y*CELL_SIZE+10, 8, 0, Math.PI*2); ctx.fill();
    });

    ctx.fillStyle = '#ef4444'; // Food
    foods.forEach(f => {
        ctx.beginPath(); ctx.arc(f.x*CELL_SIZE+10, f.y*CELL_SIZE+10, 8, 0, Math.PI*2); ctx.fill();
    });

    snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#ffffff' : playerClass.color;
        ctx.beginPath(); ctx.roundRect(s.x*CELL_SIZE+1, s.y*CELL_SIZE+1, CELL_SIZE-2, CELL_SIZE-2, 4); ctx.fill();
    });
}

// --- FLOW CONTROLS ---
function takeDamage() {
    hp--;
    if (hp <= 0) {
        gameState = 'GAMEOVER';
        document.getElementById('deathMessage').innerText = `Succumbed in Stage ${stage}.`;
        showScreen('gameover');
    } else {
        resetPosition();
    }
    updateUI();
}

function winStage() {
    clearInterval(gameLoop);
    gameState = 'SHOP';
    stage++;
    
    // Add Modifier every even stage
    lastMod = null;
    if (stage % 2 === 0) {
        const keys = Object.keys(MODIFIERS);
        const chosen = keys[Math.floor(Math.random() * keys.length)];
        activeMods[chosen] = (activeMods[chosen] || 0) + 1;
        lastMod = { id: chosen, level: activeMods[chosen] };
    }
    
    renderShop();
    showScreen('shop');
}

function startGameWithClass(clsId) {
    playerClass = CLASSES[clsId];
    hp = maxHp = playerClass.baseHp;
    speed = playerClass.baseSpeed;
    gold = playerClass.id === 'MERCHANT' ? 50 : 0;
    stage = 1; foodValue = 1; activeMods = {}; lastMod = null;
    startNextStage();
}

function startNextStage() {
    foodEaten = 0;
    resetPosition();
    gameState = 'PLAYING';
    showScreen(null);
    updateUI();
    clearInterval(gameLoop);
    gameLoop = setInterval(update, speed);
}

// --- UI MANAGERS ---
function showScreen(id) {
    document.querySelectorAll('.overlay').forEach(el => el.classList.remove('active'));
    if (id) document.getElementById(id + 'Screen').classList.add('active');
    canvas.style.opacity = id ? '0.2' : '1';
}

function updateUI() {
    document.getElementById('statStage').innerText = stage;
    document.getElementById('statHp').innerText = `${hp} / ${maxHp}`;
    document.getElementById('statGold').innerText = gold;
    document.getElementById('statFood').innerText = `${foodEaten} / ${getFoodReq()}`;
    document.getElementById('buildClass').innerText = playerClass.name;
    document.getElementById('buildClass').style.color = playerClass.color;
    document.getElementById('buildSpeed').innerText = `${speed}ms`;

    const modContainer = document.getElementById('modifierContainer');
    const modList = document.getElementById('modifierList');
    if (Object.keys(activeMods).length > 0) {
        modContainer.style.display = 'block';
        modList.innerHTML = Object.entries(activeMods).map(([k, v]) => 
            `<div class="mod-tag"><span>${MODIFIERS[k].name}</span><span style="color:#f87171">Lv.${v}</span></div>`
        ).join('');
    } else {
        modContainer.style.display = 'none';
    }
}

function renderShop() {
    document.getElementById('shopSubtitle').innerText = `Stage ${stage-1} Cleared!`;
    const warn = document.getElementById('escalationWarning');
    if (lastMod) {
        warn.style.display = 'block';
        warn.innerHTML = `<strong>Escalation!</strong> ${MODIFIERS[lastMod.id].name} reached Lv.${lastMod.level}.`;
    } else warn.style.display = 'none';

    const shopDiv = document.getElementById('shopOptions');
    shopDiv.innerHTML = '';
    
    const items = [
        { name: 'Health Potion', cost: 10, desc: '+1 HP', cond: hp < maxHp, act: () => hp++ },
        { name: 'Heart Container', cost: 50, desc: '+1 Max HP & Heal', cond: true, act: () => { maxHp++; hp++; } },
        { name: 'Golden Apples', cost: 30 * foodValue, desc: 'Food is worth more', cond: true, act: () => foodValue++ }
    ];

    items.forEach(item => {
        let btn = document.createElement('button');
        btn.className = 'shop-card';
        btn.disabled = gold < item.cost || !item.cond;
        btn.innerHTML = `<div class="card-title">${item.name} <span style="float:right; color:#fbbf24">${item.cost}g</span></div><div class="card-desc">${item.desc}</div>`;
        btn.onclick = () => { gold -= item.cost; item.act(); updateUI(); renderShop(); };
        shopDiv.appendChild(btn);
    });
}

// --- INPUTS & EVENTS ---
document.addEventListener('keydown', e => {
    if(gameState !== 'PLAYING') return;
    if(['ArrowUp','w'].includes(e.key) && dir.y === 0) nextDir = {x: 0, y: -1};
    if(['ArrowDown','s'].includes(e.key) && dir.y === 0) nextDir = {x: 0, y: 1};
    if(['ArrowLeft','a'].includes(e.key) && dir.x === 0) nextDir = {x: -1, y: 0};
    if(['ArrowRight','d'].includes(e.key) && dir.x === 0) nextDir = {x: 1, y: 0};
});

document.getElementById('startRunBtn').onclick = () => {
    const grid = document.getElementById('classOptions');
    grid.innerHTML = Object.values(CLASSES).map(c => 
        `<button class="class-card" onclick="startGameWithClass('${c.id}')">
            <div class="card-title" style="color:${c.color}">${c.name}</div>
            <div class="card-desc">${c.desc}<br>❤️ ${c.baseHp} | ⚡ ${c.baseSpeed}ms</div>
        </button>`
    ).join('');
    showScreen('classSelect');
};

document.getElementById('restartDraftBtn').onclick = document.getElementById('startRunBtn').onclick;
document.getElementById('backToMenuBtn').onclick = () => showScreen('menu');
document.getElementById('nextStageBtn').onclick = startNextStage;
document.getElementById('quitBtn').onclick = () => { clearInterval(gameLoop); gameState='MENU'; showScreen('menu'); };

// Initial draw
draw();
