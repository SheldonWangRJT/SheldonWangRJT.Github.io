document.addEventListener('DOMContentLoaded', () => {
    const difficultySelection = document.getElementById('difficulty-selection');
    const gameContainer = document.getElementById('game-container');
    const mazeContainer = document.getElementById('maze-container');
    const upBtn = document.getElementById('up-btn');
    const downBtn = document.getElementById('down-btn');
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const winMessage = document.getElementById('win-message');
    const restartBtn = document.getElementById('restart-maze-btn');
    const changeDifficultyBtn = document.getElementById('change-difficulty-btn');
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');

    let mazeWidth = 10;
    let mazeHeight = 10;
    let maze = [];
    let player = { x: 0, y: 0 };
    let gameover = false;

    function showDifficultyScreen() {
        difficultySelection.classList.remove('hidden');
        gameContainer.classList.add('hidden');
    }

    function showGameScreen() {
        difficultySelection.classList.add('hidden');
        gameContainer.classList.remove('hidden');
    }

    function startGame(size) {
        mazeWidth = size;
        mazeHeight = size;
        showGameScreen();
        init();
    }

    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const size = parseInt(btn.dataset.size, 10);
            startGame(size);
        });
    });

    changeDifficultyBtn.addEventListener('click', showDifficultyScreen);

    // --- Maze Generation (Recursive Backtracker) ---
    function generateMaze(width, height) {
        maze = Array(height).fill(null).map(() => Array(width).fill(null).map(() => ({
            north: true, south: true, east: true, west: true, visited: false
        })));
        const stack = [];
        let currentX = 0, currentY = 0;
        maze[currentY][currentX].visited = true;
        stack.push({ x: currentX, y: currentY });
        while (stack.length > 0) {
            const current = stack.pop();
            currentX = current.x;
            currentY = current.y;
            const neighbors = [];
            if (currentY > 0 && !maze[currentY - 1][currentX].visited) neighbors.push({ x: currentX, y: currentY - 1, dir: 'N' });
            if (currentY < height - 1 && !maze[currentY + 1][currentX].visited) neighbors.push({ x: currentX, y: currentY + 1, dir: 'S' });
            if (currentX < width - 1 && !maze[currentY][currentX + 1].visited) neighbors.push({ x: currentX + 1, y: currentY, dir: 'E' });
            if (currentX > 0 && !maze[currentY][currentX - 1].visited) neighbors.push({ x: currentX - 1, y: currentY, dir: 'W' });
            if (neighbors.length > 0) {
                stack.push(current);
                const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
                if (chosen.dir === 'N') {
                    maze[currentY][currentX].north = false;
                    maze[chosen.y][chosen.x].south = false;
                } else if (chosen.dir === 'S') {
                    maze[currentY][currentX].south = false;
                    maze[chosen.y][chosen.x].north = false;
                } else if (chosen.dir === 'E') {
                    maze[currentY][currentX].east = false;
                    maze[chosen.y][chosen.x].west = false;
                } else if (chosen.dir === 'W') {
                    maze[currentY][currentX].west = false;
                    maze[chosen.y][chosen.x].east = false;
                }
                maze[chosen.y][chosen.x].visited = true;
                stack.push(chosen);
            }
        }
        return maze;
    }

    // --- Maze Rendering ---
    function renderMaze() {
        const cellSize = 400 / mazeWidth;
        mazeContainer.innerHTML = '';
        mazeContainer.style.gridTemplateColumns = `repeat(${mazeWidth}, ${cellSize}px)`;
        for (let y = 0; y < mazeHeight; y++) {
            for (let x = 0; x < mazeWidth; x++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.style.width = `${cellSize}px`;
                cell.style.height = `${cellSize}px`;
                if (maze[y][x].north) cell.classList.add('wall-north');
                if (maze[y][x].south) cell.classList.add('wall-south');
                if (maze[y][x].east) cell.classList.add('wall-east');
                if (maze[y][x].west) cell.classList.add('wall-west');
                if (x === 0 && y === 0) cell.classList.add('start');
                if (x === mazeWidth - 1 && y === mazeHeight - 1) cell.classList.add('end');
                mazeContainer.appendChild(cell);
            }
        }
        renderPlayer();
    }

    // --- Player Rendering ---
    function renderPlayer() {
        const cellSize = 400 / mazeWidth;
        const existingPlayer = document.querySelector('.player');
        if (existingPlayer) existingPlayer.remove();
        const playerCell = mazeContainer.children[player.y * mazeWidth + player.x];
        const playerDiv = document.createElement('div');
        playerDiv.classList.add('player');
        playerDiv.innerHTML = '🏃';
        playerDiv.style.fontSize = `${cellSize * 0.6}px`;
        playerDiv.style.lineHeight = `${cellSize}px`;
        playerCell.appendChild(playerDiv);
    }

    // --- Player Movement ---
    function movePlayer(dx, dy) {
        if (gameover) return;
        const currentCell = maze[player.y][player.x];
        const nextX = player.x + dx;
        const nextY = player.y + dy;
        if (dx === 1 && !currentCell.east && nextX < mazeWidth) player.x = nextX;
        if (dx === -1 && !currentCell.west && nextX >= 0) player.x = nextX;
        if (dy === 1 && !currentCell.south && nextY < mazeHeight) player.y = nextY;
        if (dy === -1 && !currentCell.north && nextY >= 0) player.y = nextY;
        renderPlayer();
        checkWin();
    }

    // --- Win Condition ---
    function checkWin() {
        if (player.x === mazeWidth - 1 && player.y === mazeHeight - 1) {
            winMessage.classList.remove('hidden');
            gameover = true;
        }
    }

    // --- Event Listeners ---
    upBtn.addEventListener('click', () => movePlayer(0, -1));
    downBtn.addEventListener('click', () => movePlayer(0, 1));
    leftBtn.addEventListener('click', () => movePlayer(-1, 0));
    rightBtn.addEventListener('click', () => movePlayer(1, 0));
    document.addEventListener('keydown', (e) => {
        // Only handle arrow keys when game is active
        if (!gameContainer.classList.contains('hidden')) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                movePlayer(0, -1);
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                movePlayer(0, 1);
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                movePlayer(-1, 0);
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                movePlayer(1, 0);
            }
        }
    });

    // --- Game Initialization ---
    function init() {
        gameover = false;
        maze = generateMaze(mazeWidth, mazeHeight);
        player = { x: 0, y: 0 };
        winMessage.classList.add('hidden');
        renderMaze();
    }

    restartBtn.addEventListener('click', init);

    // Initial setup
    showDifficultyScreen();
});
