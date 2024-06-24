const board = document.getElementById('board');
const scoreElement = document.getElementById('scoreValue');
const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
const boardSize = 8;
let selectedCandy = null;
let score = 0;

function createBoard() {
    for (let i = 0; i < boardSize * boardSize; i++) {
        const candy = document.createElement('div');
        candy.classList.add('candy');
        candy.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
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

    const tempColor = candy1.style.backgroundColor;
    const tempPosition = {
        left: candy1.offsetLeft,
        top: candy1.offsetTop
    };

    setTimeout(() => {
        candy1.style.backgroundColor = candy2.style.backgroundColor;
        candy2.style.backgroundColor = tempColor;

        candy1.classList.remove('swapping');
        candy2.classList.remove('swapping');

        candy1.classList.add('popping');
        candy2.classList.add('popping');

        setTimeout(() => {
            candy1.classList.remove('popping');
            candy2.classList.remove('popping');
            checkMatches();
        }, 300);
    }, 300);
}

function checkMatches() {
    const candies = Array.from(board.children);
    let matchFound = false;

    // Check rows
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize - 2; j++) {
            const index = i * boardSize + j;
            if (candies[index].style.backgroundColor === candies[index + 1].style.backgroundColor &&
                candies[index].style.backgroundColor === candies[index + 2].style.backgroundColor) {
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
            if (candies[index].style.backgroundColor === candies[index + boardSize].style.backgroundColor &&
                candies[index].style.backgroundColor === candies[index + 2 * boardSize].style.backgroundColor) {
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

function animateAndReplaceCandy(candy) {
    candy.classList.add('popping');
    setTimeout(() => {
        candy.classList.remove('popping');
        candy.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    }, 300);
}

createBoard();
