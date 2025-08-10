document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const scoreElement = document.getElementById('score');
    const timerElement = document.getElementById('timer');
    const restartBtn = document.getElementById('restart-btn');

    const emojis = ['🧠', '🧠', '🤖', '🤖', '👻', '👻', '👽', '👽', '💀', '💀', '🤡', '🤡', '👹', '👹', '👾', '👾'];
    let flippedCards = [];
    let matchedCards = [];
    let score = 0;
    let time = 0;
    let timerInterval;

    function shuffle(array) {
        array.sort(() => Math.random() - 0.5);
    }

    function startGame() {
        shuffle(emojis);
        gameBoard.innerHTML = '';
        flippedCards = [];
        matchedCards = [];
        score = 0;
        time = 0;
        scoreElement.textContent = score;
        timerElement.textContent = `${time}s`;
        startTimer();

        emojis.forEach((emoji, index) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.dataset.emoji = emoji;
            card.dataset.index = index;

            const cardFront = document.createElement('div');
            cardFront.classList.add('card-front');
            cardFront.textContent = '?';

            const cardBack = document.createElement('div');
            cardBack.classList.add('card-back');
            cardBack.textContent = emoji;

            card.appendChild(cardFront);
            card.appendChild(cardBack);

            card.addEventListener('click', handleCardClick);
            gameBoard.appendChild(card);
        });
    }

    function startTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        timerInterval = setInterval(() => {
            time++;
            timerElement.textContent = `${time}s`;
        }, 1000);
    }

    function handleCardClick(event) {
        const clickedCard = event.currentTarget;

        if (flippedCards.length < 2 && !clickedCard.classList.contains('flipped')) {
            flipCard(clickedCard);
            flippedCards.push(clickedCard);

            if (flippedCards.length === 2) {
                checkForMatch();
            }
        }
    }

    function flipCard(card) {
        card.classList.add('flipped');
    }

    function unflipCard(card) {
        card.classList.remove('flipped');
    }



    function checkForMatch() {
        const [card1, card2] = flippedCards;
        if (card1.dataset.emoji === card2.dataset.emoji) {
            score++;
            scoreElement.textContent = score;
            matchedCards.push(card1, card2);
            card1.classList.add('matched');
            card2.classList.add('matched');
            flippedCards = [];
            if (matchedCards.length === emojis.length) {
                clearInterval(timerInterval);
                setTimeout(() => alert(`You won in ${time} seconds!`), 500);
            }
        } else {
            setTimeout(() => {
                unflipCard(card1);
                unflipCard(card2);
                flippedCards = [];
            }, 1000);
        }
    }

    restartBtn.addEventListener('click', startGame);

    startGame();
});
