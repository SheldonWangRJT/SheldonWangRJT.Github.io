const board = document.getElementById('board');
const scoreElement = document.getElementById('scoreValue');
const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
const boardSize = 8;
let selectedCandy = null;
let score = 0;

const candyTypes = [
    { shape: 'circle', color: '#D32F2F' },  // Muted red circle
    { shape: 'square', color: '#388E3C' },  // Muted green square
    { shape: 'triangle', color: '#1976D2' },  // Muted blue triangle
    { shape: 'diamond', color: '#FBC02D' },  // Muted yellow diamond
    { shape: 'cross', color: '#7B1FA2' }  // Muted purple cross
];

function createBoard() {
    for (let i = 0; i < boardSize * boardSize; i++) {
        const candy = document.createElement('div');
        candy.classList.add('candy');
        const typeIndex = Math.floor(Math.random() * candyTypes.length);
        const candyType = candyTypes[typeIndex];
        candy.style.color = candyType.color; // Change this line
        candy.classList.add(candyType.shape);
        candy.dataset.typeIndex = typeIndex;
        candy.addEventListener('click', () => selectCandy(candy));
        board.appendChild(candy);
    }
}

function selectCandy(candy) {
    if (selectedCandy === null) {
        selectedCandy = candy;
        candy.style.opacity = '0.5';
    } else {
        const index1 = Array.from(board.children).indexOf(selectedCandy);
        const index2 = Array.from(board.children).indexOf(candy);
        
        if (areAdjacent(index1, index2)) {
            swapCandies(selectedCandy, candy);
            checkMatches();
        }
        
        selectedCandy.style.opacity = '1';
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
    candy1.classList.add('swapping');
    candy2.classList.add('swapping');

    const tempTypeIndex = candy1.dataset.typeIndex;
    const tempType = candyTypes[tempTypeIndex];

    setTimeout(() => {
        candy1.style.color = candy2.style.color; // Change this line
        candy1.className = `candy ${candyTypes[candy2.dataset.typeIndex].shape}`;
        candy1.dataset.typeIndex = candy2.dataset.typeIndex;

        candy2.style.color = tempType.color; // Change this line
        candy2.className = `candy ${tempType.shape}`;
        candy2.dataset.typeIndex = tempTypeIndex;

        candy1.classList.add('popping');
        candy2.classList.add('popping');

        setTimeout(() => {
            candy1.classList.remove('popping', 'swapping');
            candy2.classList.remove('popping', 'swapping');
            checkMatches();
        }, 300);
    }, 300);
}

function animateAndReplaceCandy(candy) {
    candy.classList.add('popping');
    setTimeout(() => {
        candy.classList.remove('popping');
        const typeIndex = Math.floor(Math.random() * candyTypes.length);
        const newType = candyTypes[typeIndex];
        candy.style.color = newType.color; // Change this line
        candy.className = `candy ${newType.shape}`;
        candy.dataset.typeIndex = typeIndex;
    }, 300);
}

function checkMatches() {
    const candies = Array.from(board.children);
    let matchFound = false;

    // Check rows
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize - 2; j++) {
            const index = i * boardSize + j;
            if (candies[index].dataset.typeIndex === candies[index + 1].dataset.typeIndex &&
                candies[index].dataset.typeIndex === candies[index + 2].dataset.typeIndex) {
                animateAndReplaceCandy(candies[index]);
                animateAndReplaceCandy(candies[index + 1]);
                animateAndReplaceCandy(candies[index + 2]);
                score += 30;
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
                animateAndReplaceCandy(candies[index]);
                animateAndReplaceCandy(candies[index + boardSize]);
                animateAndReplaceCandy(candies[index + 2 * boardSize]);
                score += 30;
                matchFound = true;
            }
        }
    }

    if (matchFound) {
        scoreElement.textContent = score;
        setTimeout(checkMatches, 500);
    }
}

createBoard();
checkMatches();
