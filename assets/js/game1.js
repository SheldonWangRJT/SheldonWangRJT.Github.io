const board = document.getElementById('board');
const scoreElement = document.getElementById('scoreValue');
const comboElement = document.getElementById('comboValue');
const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
const boardSize = 8;
let selectedCandy = null;
let score = 0;
let combo = 0;
let isAnimating = false;

// Enhanced candy types with power-up variants
const candyTypes = [
    { shape: 'circle', color: '#D32F2F', name: 'Red Candy' },
    { shape: 'square', color: '#388E3C', name: 'Green Candy' },
    { shape: 'triangle', color: '#1976D2', name: 'Blue Candy' },
    { shape: 'diamond', color: '#FBC02D', name: 'Yellow Candy' },
    { shape: 'cross', color: '#7B1FA2', name: 'Purple Candy' }
];

// Audio context for sound effects
let audioContext;
let sounds = {};

// Initialize audio system
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        createSounds();
    } catch (e) {
        console.log('Audio not supported');
    }
}

// Create sound effects
function createSounds() {
    sounds.match = createTone(800, 0.1, 'sine');
    sounds.swap = createTone(400, 0.05, 'square');
    sounds.select = createTone(600, 0.03, 'triangle');
    sounds.combo = createTone(1200, 0.15, 'sawtooth');
}

function createTone(frequency, duration, type) {
    return () => {
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    };
}

// Particle system for explosion effects
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.position = 'absolute';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1000';
        document.body.appendChild(this.canvas);
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                decay: 0.02,
                color: color,
                size: Math.random() * 4 + 2
            });
        }
    }

    update() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // gravity
            p.life -= p.decay;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            
            this.ctx.save();
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
        
        if (this.particles.length > 0) {
            requestAnimationFrame(() => this.update());
        }
    }
}

const particleSystem = new ParticleSystem();

// Enhanced candy creation with power-up chance
function createBoard() {
    for (let i = 0; i < boardSize * boardSize; i++) {
        const candy = document.createElement('div');
        candy.classList.add('candy');
        const typeIndex = Math.floor(Math.random() * candyTypes.length);
        const candyType = candyTypes[typeIndex];
        
        candy.style.color = candyType.color;
        candy.classList.add(candyType.shape);
        candy.dataset.typeIndex = typeIndex;
        candy.dataset.row = Math.floor(i / boardSize);
        candy.dataset.col = i % boardSize;
        
        candy.addEventListener('click', () => selectCandy(candy));
        candy.addEventListener('touchstart', (e) => {
            e.preventDefault();
            selectCandy(candy);
        });
        
        board.appendChild(candy);
    }
}

function selectCandy(candy) {
    if (isAnimating) return;
    
    if (selectedCandy === null) {
        selectedCandy = candy;
        candy.classList.add('selected');
        if (sounds.select) sounds.select();
    } else {
        const index1 = Array.from(board.children).indexOf(selectedCandy);
        const index2 = Array.from(board.children).indexOf(candy);
        
        if (areAdjacent(index1, index2)) {
            swapCandies(selectedCandy, candy);
        }
        
        selectedCandy.classList.remove('selected');
        selectedCandy = null;
    }
}

function areAdjacent(index1, index2) {
    const row1 = Math.floor(index1 / boardSize);
    const col1 = index1 % boardSize;
    const row2 = Math.floor(index2 / boardSize);
    const col2 = index2 % boardSize;
    
    return (Math.abs(row1 - row2) === 1 && col1 === col2) || (Math.abs(col1 - col2) === 1 && row1 === row2);
}

function swapCandies(candy1, candy2) {
    if (isAnimating) return;
    isAnimating = true;
    
    candy1.classList.add('swapping');
    candy2.classList.add('swapping');
    
    if (sounds.swap) sounds.swap();

    const tempTypeIndex = candy1.dataset.typeIndex;
    const tempType = candyTypes[tempTypeIndex];

    setTimeout(() => {
        candy1.style.color = candy2.style.color;
        candy1.className = `candy ${candyTypes[candy2.dataset.typeIndex].shape}`;
        candy1.dataset.typeIndex = candy2.dataset.typeIndex;

        candy2.style.color = tempType.color;
        candy2.className = `candy ${tempType.shape}`;
        candy2.dataset.typeIndex = tempTypeIndex;

        candy1.classList.remove('swapping');
        candy2.classList.remove('swapping');
        
        checkMatches();
    }, 300);
}

function animateAndReplaceCandy(candy) {
    const rect = candy.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Create explosion effect
    particleSystem.createExplosion(centerX, centerY, candy.style.color);
    particleSystem.update();
    
    candy.classList.add('popping');
    
    if (sounds.match) sounds.match();
    
    setTimeout(() => {
        candy.classList.remove('popping');
        // Mark candy for removal instead of replacing it
        candy.classList.add('removing');
    }, 400);
}

function resetCandyTransforms() {
    const candies = Array.from(board.children);
    candies.forEach(candy => {
        candy.style.transform = '';
        candy.style.transition = '';
    });
}

function dropTiles() {
    const candies = Array.from(board.children);
    let hasDropped = false;
    
    console.log('dropTiles called'); // Debug
    
    // First, identify and clear only the truly empty positions (removed candies)
    let removedCount = 0;
    const emptyPositions = new Set();
    
    candies.forEach((candy, index) => {
        if (candy.classList.contains('removing') || 
            candy.classList.contains('popping') || 
            !candy.dataset.typeIndex || 
            candy.dataset.typeIndex === '') {
            
            // Mark this position as empty
            emptyPositions.add(index);
            
            // Clear the candy
            candy.style.color = '';
            candy.className = 'candy';
            candy.dataset.typeIndex = '';
            candy.classList.remove('removing', 'popping');
            candy.style.opacity = '0';
            removedCount++;
        }
    });
    
    console.log('Found', removedCount, 'empty positions'); // Debug
    
    if (removedCount === 0) {
        console.log('No empty positions, nothing to drop');
        return false;
    }
    
    // Process each column to handle gravity
    for (let col = 0; col < boardSize; col++) {
        // Get all candies in this column from bottom to top
        const columnIndices = [];
        for (let row = boardSize - 1; row >= 0; row--) {
            columnIndices.push(row * boardSize + col);
        }
        
        // Separate valid candies from empty positions in this column
        const validCandies = [];
        let emptyCount = 0;
        
        for (const index of columnIndices) {
            if (emptyPositions.has(index)) {
                emptyCount++;
            } else {
                const candy = candies[index];
                if (candy.dataset.typeIndex && candy.dataset.typeIndex !== '') {
                    validCandies.push({
                        typeIndex: candy.dataset.typeIndex,
                        color: candy.style.color,
                        className: candy.className
                    });
                } else {
                    emptyCount++;
                }
            }
        }
        
        if (emptyCount > 0) {
            hasDropped = true;
            
            // Clear the entire column
            for (const index of columnIndices) {
                const candy = candies[index];
                candy.style.color = '';
                candy.className = 'candy';
                candy.dataset.typeIndex = '';
                candy.style.opacity = '1';
            }
            
            // Place valid candies at the bottom
            for (let i = 0; i < validCandies.length; i++) {
                const bottomIndex = columnIndices[i]; // Start from bottom
                const candy = candies[bottomIndex];
                const candyData = validCandies[i];
                
                candy.style.color = candyData.color;
                candy.className = candyData.className;
                candy.dataset.typeIndex = candyData.typeIndex;
                candy.style.opacity = '1';
            }
            
            // Add new candies to fill the top
            for (let i = 0; i < emptyCount; i++) {
                const topIndex = columnIndices[validCandies.length + i];
                const candy = candies[topIndex];
                
                // Create new candy
                const typeIndex = Math.floor(Math.random() * candyTypes.length);
                const newType = candyTypes[typeIndex];
                candy.style.color = newType.color;
                candy.className = `candy ${newType.shape}`;
                candy.dataset.typeIndex = typeIndex;
                
                // Start from above and animate down
                candy.style.transform = 'translateY(-100px)';
                candy.style.opacity = '0';
                candy.style.transition = 'none';
                candy.classList.add('dropping');
                
                setTimeout(() => {
                    candy.style.transition = 'all 0.3s ease';
                    candy.style.transform = 'translateY(0)';
                    candy.style.opacity = '1';
                    setTimeout(() => {
                        candy.classList.remove('dropping');
                    }, 300);
                }, i * 50); // Faster stagger
            }
        }
    }
    
    console.log('dropTiles finished, hasDropped:', hasDropped); // Debug
    return hasDropped;
}

function checkMatches() {
    const candies = Array.from(board.children);
    let matchFound = false;
    let matchedCandies = new Set();

    // Regular match detection
    // Check rows
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize - 2; j++) {
            const index = i * boardSize + j;
            if (candies[index].dataset.typeIndex === candies[index + 1].dataset.typeIndex &&
                candies[index].dataset.typeIndex === candies[index + 2].dataset.typeIndex) {
                matchedCandies.add(candies[index]);
                matchedCandies.add(candies[index + 1]);
                matchedCandies.add(candies[index + 2]);
                matchFound = true;
            }
        }
    }

    // Check columns
    for (let i = 0; i < boardSize - 2; i++) {
        for (let j = 0; j < boardSize; j++) {
            const index = i * boardSize + j;
            if (candies[index].dataset.typeIndex === candies[index + boardSize].dataset.typeIndex &&
                candies[index].dataset.typeIndex === candies[index + 2 * boardSize].dataset.typeIndex) {
                matchedCandies.add(candies[index]);
                matchedCandies.add(candies[index + boardSize]);
                matchedCandies.add(candies[index + 2 * boardSize]);
                matchFound = true;
            }
        }
    }

    if (matchFound) {
        combo++;
        const baseScore = 30 * matchedCandies.size;
        const comboBonus = Math.floor(combo * 0.5) * 10;
        const totalScore = baseScore + comboBonus;
        
        score += totalScore;
        scoreElement.textContent = score;
        comboElement.textContent = combo;
        
        // Show combo animation
        if (combo > 1) {
            const comboDisplay = document.getElementById('combo');
            comboDisplay.classList.add('show');
            setTimeout(() => comboDisplay.classList.remove('show'), 1000);
        }
        
        // Animate all matched candies for removal
        matchedCandies.forEach(candy => {
            animateAndReplaceCandy(candy);
        });
        
        if (sounds.combo && combo > 1) sounds.combo();
        
        // Phase 1: Wait for removal animations to complete
        // Removing animation is 0.4s = 400ms, wait just a bit longer
        setTimeout(() => {
            // Phase 2: Now drop tiles as a separate animation
            console.log('Starting dropTiles after removal animations'); // Debug
            const hasDropped = dropTiles();
            console.log('dropTiles returned:', hasDropped); // Debug
            
            // Wait for drop animations to complete, then check for new matches
            setTimeout(() => {
                // Reset transforms after dropping animation
                resetCandyTransforms();
                
                if (hasDropped) {
                    checkMatches(); // Check for new matches after dropping
                } else {
                    combo = 0;
                    comboElement.textContent = combo;
                    isAnimating = false;
                }
            }, 600);
        }, 500); // Reduced timing: 400ms removing + 100ms buffer
    } else {
        combo = 0;
        comboElement.textContent = combo;
        isAnimating = false;
    }
}

// Initialize everything
initAudio();
createBoard();
checkMatches();
