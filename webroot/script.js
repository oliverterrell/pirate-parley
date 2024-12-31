let isInitialPosition = true;
let currentHandlers = null;
let currentPosition = null;
let currentEnergy = null;
let currentGameMap = null;
let visitedSquares = null;
let isProcessingMove = false;
let currentScore = null;
let wordLength = null;
let currentLetter = null;
let guessedLetters = null;
let partialWord = null;
let fullReset = false;
let startTime = Date.now();
let timerInterval = null;
let totalElapsedSeconds = 0;
let solveTry = '';

const startTimer = (initialElapsedTime = 0) => {
  if (timerInterval) return;
  
  totalElapsedSeconds = initialElapsedTime;
  startTime = Date.now() - (totalElapsedSeconds * 1000); // Adjust start time based on previous elapsed time
  
  timerInterval = setInterval(() => {
    totalElapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    // Update timer display
    const timerDisplay = document.querySelector('#player-time');
    if (timerDisplay) {
      const minutes = Math.floor(totalElapsedSeconds / 60);
      const seconds = totalElapsedSeconds % 60;
      timerDisplay.innerText = `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    }
    
    // Send updated time to parent
    window.parent?.postMessage(
      {
        type: 'updateTimer',
        data: {
          elapsedTime: totalElapsedSeconds
        }
      },
      '*'
    );
  }, 1000);
};

const resetTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  totalElapsedSeconds = 0;
  startTime = Date.now();
  
  const timerDisplay = document.querySelector('#player-time');
  if (timerDisplay) {
    timerDisplay.innerText = '00m 00s';
  }
};

const isAvailableMoveSquare = (position) => {
  return (
    position.row >= 1 &&
    position.row <= 8 &&
    position.col >= 1 &&
    position.col <= 13 &&
    currentGameMap?.['r' + position.row]?.['c' + position.col] !== 'water'
  );
}
const findAdjacentSquares = (position) => {
  const ringPositions = [
    {row: position.row - 1, col: position.col - 1},
    {row: position.row - 1, col: position.col},
    {row: position.row - 1, col: position.col + 1},
    {row: position.row, col: position.col - 1},
    {row: position.row, col: position.col + 1},
    {row: position.row + 1, col: position.col - 1},
    {row: position.row + 1, col: position.col},
    {row: position.row + 1, col: position.col + 1},
  ];
  
  const plusPositions = [
    {row: position.row - 1, col: position.col},
    {row: position.row + 1, col: position.col},
    {row: position.row, col: position.col - 1},
    {row: position.row, col: position.col + 1},
  ]
  
  
  const ringSquares = [];
  for (let pos of ringPositions) {
    // filter out impassible squares and edge of map
    if (isAvailableMoveSquare(pos)) {
      const ringSquare = document.querySelector(`div[data-position="${pos.row},${pos.col}"]`);
      ringSquares.push(ringSquare);
    }
  }
  
  const plusSquares = [];
  for (let pos of plusPositions) {
    // filter out impassible squares and edge of map
    if (isAvailableMoveSquare(pos)) {
      const plusSquare = document.querySelector(`div[data-position="${pos.row},${pos.col}"]`);
      plusSquares.push(plusSquare);
    }
  }
  
  return {ringSquares, plusSquares};
}
const arePositionsEqual = (pos1, pos2) => {
  return pos1 && pos2 && pos1.row === pos2.row && pos1.col === pos2.col;
}

const initPlayer = (playerPosition, previousPosition) => {
  // First, do a global cleanup to ensure no stray states
  globalCleanup();
  
  // Get squares around player
  const {ringSquares, plusSquares} = findAdjacentSquares(playerPosition);
  const playerSquare = document.querySelector(`div[data-position="${playerPosition.row},${playerPosition.col}"]`);
  
  // Store event handlers so they can be properly removed later
  const handlers = {
    playerClick: null,
    playerMouseover: null,
    playerMouseout: null,
    availableMoveClick: null,
    ringSquareHandlers: new Map()
  };
  
  // Handler for available move clicks
  handlers.availableMoveClick = (e) => {
    const square = e.currentTarget;
    const [row, col] = square.dataset.position.split(',').map(Number);
    
    // Add visual feedback if no energy
    if (currentEnergy <= 0) {
      // Add a class for visual feedback
      playerSquare.classList.add('no-energy');
      setTimeout(() => {
        playerSquare.classList.remove('no-energy');
      }, 500);
      return;
    }
    
    movePlayer({row, col}, playerPosition);
  };
  
  // Handler for clicking player square
  handlers.playerClick = () => {
    const isCurrentlyClicked = playerSquare.classList.contains('clicked');
    
    if (isCurrentlyClicked) {
      // If already clicked, remove clicked state and hide moves
      playerSquare.classList.remove('clicked');
      plusSquares.forEach(plusSquare => {
        plusSquare.classList.remove('available-move');
        plusSquare.removeEventListener('click', handlers.availableMoveClick);
      });
    } else {
      // If not clicked, add clicked state and show moves
      playerSquare.classList.add('clicked');
      plusSquares.forEach(plusSquare => {
        plusSquare.classList.add('available-move');
        plusSquare.addEventListener('click', handlers.availableMoveClick);
      });
    }
  };
  
  // Handler for hovering over player square
  handlers.playerMouseover = () => {
    if (!playerSquare.classList.contains('clicked')) {
      plusSquares.forEach(plusSquare => {
        plusSquare.classList.add('available-move');
        plusSquare.addEventListener('click', handlers.availableMoveClick);
      });
    }
  };
  
  // Handler for mouse leaving player square
  handlers.playerMouseout = () => {
    if (!playerSquare.classList.contains('clicked')) {
      plusSquares.forEach(plusSquare => {
        plusSquare.classList.remove('available-move');
        plusSquare.removeEventListener('click', handlers.availableMoveClick);
      });
    }
  };
  
  // Clean up previous position
  if (previousPosition) {
    cleanupPosition(previousPosition, handlers);
  }
  
  // Set up new player square
  playerSquare.innerHTML = '<img src="assets/icon_player.png" alt="player1" width="29" height="29" />';
  playerSquare.addEventListener('click', handlers.playerClick);
  playerSquare.addEventListener('mouseover', handlers.playerMouseover);
  playerSquare.addEventListener('mouseout', handlers.playerMouseout);
  
  // Set up ring square handlers
  ringSquares.forEach(ringSquare => {
    const ringHandlers = {
      mouseover: () => {
        plusSquares.forEach(square => {
          square.classList.add('available-move');
          square.addEventListener('click', handlers.availableMoveClick);
        });
      },
      mouseout: () => {
        if (!playerSquare.classList.contains('clicked')) {
          plusSquares.forEach(square => {
            square.classList.remove('available-move');
            square.removeEventListener('click', handlers.availableMoveClick);
          });
        }
      }
    };
    
    // Store handlers for this ring square
    handlers.ringSquareHandlers.set(ringSquare, ringHandlers);
    
    // Add event listeners
    ringSquare.addEventListener('mouseover', ringHandlers.mouseover);
    ringSquare.addEventListener('mouseout', ringHandlers.mouseout);
  });
  
  return handlers;
};
const globalCleanup = () => {
  // Remove all player images
  document.querySelectorAll('img[alt="player1"]').forEach(img => img.remove());
  
  // Remove all available-move classes
  document.querySelectorAll('.available-move').forEach(square => {
    square.classList.remove('available-move');
  });
  
  // Remove clicked class from all squares
  document.querySelectorAll('.clicked').forEach(square => {
    square.classList.remove('clicked');
  });
};
const cleanupPosition = (position, handlers) => {
  const square = document.querySelector(`div[data-position="${position.row},${position.col}"]`);
  if (!square) return;
  
  // Clean up player square
  square.innerHTML = '';
  square.classList.remove('clicked');
  
  if (handlers.playerClick) {
    square.removeEventListener('click', handlers.playerClick);
  }
  if (handlers.playerMouseover) {
    square.removeEventListener('mouseover', handlers.playerMouseover);
  }
  if (handlers.playerMouseout) {
    square.removeEventListener('mouseout', handlers.playerMouseout);
  }
  
  // Clean up ring squares
  if (handlers.ringSquareHandlers) {
    handlers.ringSquareHandlers.forEach((ringHandlers, ringSquare) => {
      ringSquare.removeEventListener('mouseover', ringHandlers.mouseover);
      ringSquare.removeEventListener('mouseout', ringHandlers.mouseout);
    });
    // Clear the map after cleanup
    handlers.ringSquareHandlers.clear();
  }
  
  // Remove all available move classes and click handlers
  document.querySelectorAll('.available-move').forEach(square => {
    square.classList.remove('available-move');
    if (handlers.availableMoveClick) {
      square.removeEventListener('click', handlers.availableMoveClick);
    }
  });
};

const resetLetterDisplay = () => {
  document.querySelectorAll('.key').forEach(key => {
    key.classList.remove('selected');
  });
}
const updateLetterDisplay = () => {
  if (!guessedLetters) return;
  
  document.querySelectorAll('.key').forEach(key => {
    if (!guessedLetters.includes(key.dataset.letter.toLowerCase())) {
      key.addEventListener('click', () => {
        if (currentLetter && currentLetter !== 'backspace') {
          document.querySelector(`div[data-letter="${currentLetter.toUpperCase()}"]`).classList.remove('selected');
        }
        currentLetter = key.dataset.letter.toLowerCase();
        key.classList.add('selected');
      });
    } else if (partialWord.includes(key.dataset.letter.toLowerCase())) {
      key.classList.add('correct');
      key.classList.remove('selected');
    } else {
      key.classList.add('incorrect');
      key.classList.remove('selected');
    }
    if (key.dataset.letter.toLowerCase() === currentLetter?.toLowerCase()) {
      key.classList.add('bounce');
      setTimeout(() => {
        key.classList.remove('bounce')
        currentLetter = null;
      }, 500);
    }
  })
  
  let solveTiles = ``;
  for (let i = 0; i < wordLength; i++) {
    const letterIsSolved = partialWord.charAt(i) !== '_';
    solveTiles += `<div class="solve-tile jersey ${letterIsSolved ? 'correct' : ''}" data-letter-position="${i}">${letterIsSolved ? partialWord.charAt(i).toUpperCase() : ''}</div>`;
  }
  
  document.getElementById('solve-tiles-container').innerHTML = solveTiles;
}

const updateMapDisplay = () => {
  if (!currentGameMap) return;
  
  // Clear existing map items
  document.querySelectorAll('.map-item').forEach(item => item.remove());
  
  // Loop through the board and add items
  Object.entries(currentGameMap).forEach(([row, cols]) => {
    const rowNum = parseInt(row.substring(1)); // Get number from "r1", "r2" etc
    
    Object.entries(cols).forEach(([col, item]) => {
      const colNum = parseInt(col.substring(1)); // Get number from "c1", "c2" etc
      const square = document.querySelector(`div[data-position="${rowNum},${colNum}"]`);
      
      if (square && !visitedSquares.has(`${rowNum},${colNum}`)) {
        // Add appropriate class and content based on item type
        const itemElement = document.createElement('div');
        itemElement.classList.add('map-item', `map-item-${item}`);
        
        // Add appropriate image or content based on item type
        switch (item) {
          case 'bush':
            itemElement.innerHTML = '<img src="assets/bush.png" alt="bush" width="29" height="29" />';
            break;
          case 'chest':
            itemElement.innerHTML = '<img src="assets/chest.png" alt="chest" width="29" height="29" />';
            break;
          case 'drumstick':
            itemElement.innerHTML = '<img src="assets/drumstick.png" alt="drumstick" width="29" height="29" />';
            break;
          case 'rum':
            itemElement.innerHTML = '<img src="assets/rum.png" alt="rum" width="29" height="29" />';
            break;
          case 'rock':
            itemElement.innerHTML = '<img src="assets/rock.png" alt="rock" width="29" height="29" />';
            break;
          case 'water':
            itemElement.innerHTML = '<img src="assets/tile_water.png" alt="water" width="29" height="30"  />';
            break;
          default:
            break;
        }
        
        square.appendChild(itemElement);
      }
    });
  });
};

const openLetterBoard = () => {
  const modal = document.getElementById('letter-board-modal');
  modal.classList.remove('hidden');
  
  const ayeAyeBtn = document.getElementById('aye-aye-button');
  ayeAyeBtn.addEventListener('click', () => {
    setTimeout(() => modal.classList.add('hidden'), 1500);
  });
}
const handleChestSquare = () => {
  const title = document.getElementById('letter-board-title');
  title.innerHTML = 'Choose wisely';
  openLetterBoard();
  const xBtn = document.getElementById('letter-board-x-button');
  xBtn.classList.add('hidden');
}

const solveKeyHandler = (event) => {
  const key = event.currentTarget;
  
  if (key.dataset.letter === 'backspace') {
    if (solveTry.length > 0) {
      const lastTile = document.querySelector(`div[data-solve-letter-position="${solveTry.length - 1}"]`);
      if (lastTile) {
        lastTile.classList.remove('letter-solve-guess');
        lastTile.innerText = '';
      }
      solveTry = solveTry.slice(0, -1);
    }
    return;
  }
  
  if (solveTry.length < wordLength) {
    solveTry += key.dataset.letter.toLowerCase();
    
    for (let i = 0; i < solveTry.length; i++) {
      const solveTryTile = document.querySelector(`div[data-solve-letter-position="${i}"]`)
      solveTryTile.innerText = solveTry[i].toUpperCase();
      solveTryTile.classList.add('letter-solve-guess');
    }
  }
}

const handleSolveButtonClick = () => {
  const xBtn = document.getElementById('letter-board-x-button');
  const title = document.getElementById('letter-board-title');
  const disclaimer = document.getElementById('solve-disclaimer')
  const ayeAyeBtn = document.getElementById('aye-aye-button')
  const trySolveBtn = document.getElementById('try-solve-button')
  const backspace = document.getElementById('backspace-button')
  const solvePreview = document.getElementById('solve-preview');
  const letterBoard = document.getElementById('letter-board-dialog');
  const keyboardContainer = document.getElementById('keyboard-container');
  
  title.innerHTML = 'Solve The Puzzle';
  xBtn.classList.remove('hidden');
  disclaimer.classList.remove('hidden');
  ayeAyeBtn.classList.add('hidden');
  trySolveBtn.classList.remove('hidden');
  backspace.classList.remove('hidden');
  
  let solvePreviewTiles = ``;
  for (let i = 0; i < wordLength; i++) {
    solvePreviewTiles += `<div class="solve-preview-tile jersey" data-solve-letter-position="${i}"></div>`;
  }
  
  letterBoard.classList.add('letter-board-solve');
  keyboardContainer.classList.add('solve-keyboard-container');
  
  solvePreview.innerHTML = solvePreviewTiles;
  solvePreview.classList.remove('hidden');
  
  openLetterBoard(true);
  
  document.querySelectorAll('.key').forEach((key) => {
    key.classList.add('pointer');
    key.addEventListener('click', solveKeyHandler);
  });
  
  trySolveBtn.addEventListener('click', () => {
    if (solveTry.length !== wordLength) {
      // Show some visual feedback that word is incomplete
      solvePreview.classList.add('shake');
      setTimeout(() => solvePreview.classList.remove('shake'), 500);
      return;
    }
    
    // Send solve attempt to parent
    window.parent?.postMessage(
      {
        type: 'solvePuzzle',
        data: {
          solveAttempt: solveTry
        }
      },
      '*'
    );
  });
}

const resetSolveBoard = () => {
  const disclaimer = document.getElementById('solve-disclaimer')
  const ayeAyeBtn = document.getElementById('aye-aye-button')
  const trySolveBtn = document.getElementById('try-solve-button')
  const backspace = document.getElementById('backspace-button')
  const solvePreview = document.getElementById('solve-preview');
  const letterBoard = document.getElementById('letter-board-dialog');
  const keyboardContainer = document.getElementById('keyboard-container');
  
  document.querySelectorAll('.key').forEach((key) => {
    key.classList.remove('selected');
    key.classList.remove('pointer');
  })
  
  backspace.classList.add('hidden');
  disclaimer.classList.add('hidden');
  ayeAyeBtn.classList.remove('hidden');
  trySolveBtn.classList.add('hidden');
  solvePreview.classList.add('hidden');
  letterBoard.classList.remove('letter-board-solve');
  keyboardContainer.classList.remove('solve-keyboard-container');
  
  solveTry = '';
  const solveGuesses = document.querySelectorAll('.solve-preview-tile');
  solveGuesses.forEach((tile) => tile.classList.remove('wrong'));
  
  const modal = document.getElementById('letter-board-modal');
  modal.classList.add('hidden');
}

const handleAyeAye = () => {
  if (!currentLetter) return;
  
  const newGuessedLetters = guessedLetters;
  newGuessedLetters.push(currentLetter);
  
  window.parent?.postMessage(
    {
      type: 'guessLetter',
      data: {
        letter: currentLetter,
        guessedLetters: newGuessedLetters,
        visitedSquares: Array.from(visitedSquares),
      }
    },
    '*'
  );
}

const handleLeaveSquare = (position) => {
  // if ((currentGameMap?.['r' + position.row]?.['c' + position.col] || null) === 'chest') {
  //   const square = document.querySelector(`div[data-position="${position.row},${position.col}"]`);
  //   square.innerHTML = '<img src="assets/chest.png" alt="chest" width="29" height="29" style="opacity: 0.4" />';
  // }
  
  if (currentEnergy <= 0 && partialWord.includes('_')) {
    const modal = document.getElementById('you-died-modal');
    modal.classList.remove('hidden');
  }
}
const handleEnterSquare = (position) => {
  const squareType = currentGameMap?.['r' + position.row]?.['c' + position.col] ?? null;
  const playerEnergy = document.querySelector('#player-energy');
  
  if (!visitedSquares.has(position.row + ',' + position.col)) {
    visitedSquares.add(position.row + ',' + position.col);
    switch (squareType) {
      case 'chest':
        currentEnergy -= 1;
        playerEnergy.classList.add('red-text');
        playerEnergy.classList.remove('green-text');
        handleChestSquare();
        break;
      case 'bush':
        playerEnergy.classList.add('red-text');
        playerEnergy.classList.remove('green-text');
        currentEnergy -= 2;
        break;
      case 'drumstick':
        playerEnergy.classList.add('green-text');
        playerEnergy.classList.remove('red-text');
        currentEnergy += 1;
        break;
      case 'rum':
        playerEnergy.classList.add('green-text');
        playerEnergy.classList.remove('red-text');
        currentEnergy += 3;
        break;
      case 'rock':
        playerEnergy.classList.add('red-text');
        playerEnergy.classList.remove('green-text');
        currentEnergy -= 3;
        break;
      case 'water':
        break;
      default:
        playerEnergy.classList.add('red-text');
        playerEnergy.classList.remove('green-text');
        currentEnergy -= 1;
        break;
    }
  } else if (!fullReset) {
    playerEnergy.classList.add('red-text');
    playerEnergy.classList.remove('green-text');
    currentEnergy -= 1;
  } else {
    playerEnergy.classList.remove('red-text');
    playerEnergy.classList.remove('green-text');
    fullReset = false;
  }
  
  playerEnergy.innerText = currentEnergy;
}
const movePlayer = async (newPosition, oldPosition) => {
  // Don't process new moves if we're already processing one
  if (isProcessingMove) {
    console.log('Move already processing, ignoring new move request');
    return;
  }
  
  try {
    isProcessingMove = true;
    
    if (currentEnergy === null) {
      currentEnergy = 30;
    }
    
    // Don't allow movement if no energy left (except for initial positioning)
    if (currentEnergy <= 0 && !arePositionsEqual(newPosition, oldPosition) && !isInitialPosition) {
      return;
    }
    
    // good faith cleanup
    if (isInitialPosition) {
      cleanupPosition(oldPosition, {
        playerMouseover: null,
        playerMouseout: null,
        playerClick: null,
        availableMoveClick: null,
        ringSquareHandlers: new Map()
      });
      isInitialPosition = false;
    }
    
    if (currentHandlers) {
      cleanupPosition(oldPosition, currentHandlers);
    }
    
    currentHandlers = initPlayer(newPosition, oldPosition);
    
    if (!arePositionsEqual(newPosition, oldPosition)) {
      if (!isInitialPosition) {
        handleEnterSquare(newPosition);
        handleLeaveSquare(oldPosition)
      }
      
      await new Promise((resolve) => {
        const messageHandler = (ev) => {
          const {type, data} = ev.data;
          if (type === 'devvit-message' &&
            data.message.type === 'movePlayerResponse' &&
            arePositionsEqual(data.message.data.playerPosition, newPosition)) {
            window.removeEventListener('message', messageHandler);
            
            currentEnergy = data.message.data.playerEnergy;
            const playerEnergy = document.querySelector('#player-energy');
            if (playerEnergy) {
              playerEnergy.innerText = currentEnergy;
              if (currentEnergy < 30 && !playerEnergy.classList.contains('green-text')) {
                playerEnergy.classList.add('red-text');
              } else {
                playerEnergy.classList.remove('red-text');
              }
            }
            
            resolve();
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        window.parent?.postMessage(
          {
            type: 'movePlayer',
            data: {
              playerPosition: newPosition,
              playerEnergy: currentEnergy,
              visitedSquares: Array.from(visitedSquares),
            }
          },
          '*'
        );
      });
    }
    
    currentPosition = newPosition;
  } finally {
    isProcessingMove = false;
  }
};

const handleGameOverButtonClick = () => {
  window.parent?.postMessage({type: 'completeGame'}, '*');
  window.parent?.postMessage({type: 'hideWebView'}, '*');
}

class App {
  constructor() {
    const playerScore = document.querySelector('#player-score');
    const playerEnergy = document.querySelector('#player-energy');
    
    // When the Devvit app sends a message with `context.ui.webView.postMessage`, this will be triggered
    window.addEventListener('message', (ev) => {
      const {type, data} = ev.data;
      
      // `context.ui.webView.postMessage` posted from main.tsx
      if (type === 'devvit-message') {
        const {message} = data;
        
        if (message.type === 'triggerReset') {
          resetTimer();
          window.parent?.postMessage(
            {
              type: 'reset',
              data: {
                playerPosition: {row: 1, col: 1},
                playerEnergy: 30,
                visitedSquares: [],
              }
            },
            '*'
          );
        }
        
        if (message.type === 'initialData') {
          console.log('Initial data received:', message.data);
          const {
            username,
            playerPosition,
            playerScore: redisPlayerScore,
            playerEnergy: redisPlayerEnergy,
            gameMap,
            wordLength: redisWordLength,
            visitedSquares: redisVisitedSquares,
            guessedLetters: redisGuessedLetters,
            allGames,
            partialWord: redisPartialWord,
            reset,
            elapsedTime
          } = message.data;
          
          fullReset = reset;
          
          if (fullReset) {
            resetTimer();
            startTimer(0);
            document.querySelectorAll('.key').forEach((key) => {
              key.classList.remove('correct');
              key.classList.remove('incorrect');
              key.classList.remove('selected');
            })
          } else {
            startTimer(elapsedTime);
          }
          
          // if (allGames) {
          //   const buttonContainer = document.getElementById('button-container');
          //   buttonContainer.innerHTML = '';
          //   Object.entries(allGames).sort(([keyA, gA], [keyB, gB]) => parseInt(keyA.split('_')[1]) - parseInt(keyB.split('_')[1])).forEach(([_, game], i) => {
          //     const gameBtn = document.createElement('button');
          //     gameBtn.className = 'btn-game-dev-use';
          //     gameBtn.innerHTML = (i + 1) + '. ' + game.word;
          //     gameBtn.addEventListener('click', () => {
          //       window.parent?.postMessage(
          //         {
          //           type: 'reset',
          //           data: {
          //             game,
          //             playerPosition: {row: 1, col: 1},
          //             playerEnergy: 30,
          //             visitedSquares: []
          //           }
          //         },
          //         '*'
          //       );
          //     });
          //     buttonContainer.appendChild(gameBtn)
          //   })
          // }
          
          const usernameBox = document.getElementById('you-died-username');
          const survivedUsernameBox = document.getElementById('survived-username')
          usernameBox.innerText = username;
          survivedUsernameBox.innerText = username;
          
          // Store game map
          wordLength = Number(redisWordLength || 5);
          currentGameMap = gameMap;
          currentScore = Number(redisPlayerScore || 0);
          visitedSquares = new Set(redisVisitedSquares || []);
          guessedLetters = redisGuessedLetters || [];
          partialWord = redisPartialWord || new Array(redisWordLength).fill('_').join('');
          
          updateMapDisplay();
          updateLetterDisplay();
          
          playerScore.innerText = currentScore;
          
          currentEnergy = Number(redisPlayerEnergy);
          
          if (playerEnergy) {
            playerEnergy.innerText = currentEnergy;
            if (currentEnergy < 30) {
              playerEnergy.classList.add('red-text');
            } else {
              playerEnergy.classList.remove('red-text');
            }
          }
          
          // Parse stored position
          const position = typeof playerPosition === 'string' ?
            JSON.parse(playerPosition) :
            (playerPosition || {row: 1, col: 1});
          
          // Initialize player at stored position
          if (!currentPosition || !arePositionsEqual(currentPosition, position)) {
            movePlayer(position, currentPosition || position);
          }
        }
        
        if (message.type === 'solveAttempt') {
          const {
            timeBonus,
            energyBonus,
            correct,
            playerEnergy: redisPlayerEnergy,
            finalScore,
            energyRemaining,
            timeToSolve,
            finalWord,
            playerRank,
            leaderboardLength
          } = message.data;
          currentEnergy = redisPlayerEnergy;
          playerEnergy.innerText = currentEnergy;
          
          document.querySelectorAll('.key').forEach((key) => {
            key.removeEventListener('click', solveKeyHandler)
          })
          
          if (currentEnergy <= 0 && !correct) {
            const modal = document.getElementById('you-died-modal');
            modal.classList.remove('hidden');
          }
          
          if (correct === false) {
            document.querySelectorAll('.solve-preview-tile').forEach((tile) => tile.classList.add('wrong'));
            setTimeout(resetSolveBoard, 1800)
          } else {
            clearInterval(timerInterval);
            
            let solveTiles = ``;
            for (let i = 0; i < finalWord.length; i++) {
              solveTiles += `<div class="solve-tile jersey correct" data-letter-position="${i}">${finalWord.charAt(i).toUpperCase()}</div>`;
            }
            
            document.getElementById('solve-tiles-container').innerHTML = solveTiles;
            const survivedEnergy = document.getElementById('survived-energy');
            const energyBonusDisplay = document.getElementById('energy-bonus');
            const survivedTime = document.getElementById('survived-time');
            const timeBonusDisplay = document.getElementById('time-bonus');
            const survivedScore = document.getElementById('survived-puzzle');
            const leaderboardRank = document.getElementById('leaderboard-rank');
            
            leaderboardRank.innerText = playerRank + '/' + leaderboardLength;
            timeBonusDisplay.innerText = timeBonus + 'pts';
            energyBonusDisplay.innerText = energyBonus + 'pts';
            survivedScore.innerText = finalScore + 'pts';
            playerScore.innerText = finalScore;
            survivedEnergy.innerText = energyRemaining + '/30';
            const minutes = Math.floor(timeToSolve / 60);
            const seconds = timeToSolve % 60;
            survivedTime.innerText = `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
            
            document.querySelectorAll('.solve-preview-tile').forEach((tile) => tile.classList.add('correct'));
            
            setTimeout(() => {
              const modal = document.getElementById('survived-modal');
              modal.classList.remove('hidden');
              const letterModal = document.getElementById('letter-board-modal');
              letterModal.classList.add('hidden');
              
            }, 1500)
            
          }
        }
        
        if (message.type === 'guessLetter') {
          const {
            guessedLetters: redisGuessedLetters,
            partialWord: redisPartialWord,
            playerScore: redisPlayerScore,
            gameComplete,
            energyRemaining,
            timeToSolve,
            finalScore,
            timeBonus,
            energyBonus,
            playerRank,
            leaderboardLength,
          } = message.data;
          
          currentScore = redisPlayerScore || 0;
          
          guessedLetters = redisGuessedLetters;
          partialWord = redisPartialWord;
          
          playerScore.innerText = currentScore;
          
          updateLetterDisplay();
          
          if (gameComplete) {
            clearInterval(timerInterval);
            const survivedEnergy = document.getElementById('survived-energy');
            const timeBonusDisplay = document.getElementById('time-bonus');
            const energyBonusDisplay = document.getElementById('energy-bonus');
            const survivedTime = document.getElementById('survived-time');
            const leaderboardRank = document.getElementById('leaderboard-rank');
            const survivedScore = document.getElementById('survived-puzzle');
            
            timeBonusDisplay.innerText = timeBonus + 'pts';
            leaderboardRank.innerText = playerRank + '/' + leaderboardLength;
            energyBonusDisplay.innerText = energyBonus + 'pts';
            survivedScore.innerText = finalScore + 'pts';
            playerScore.innerText = finalScore;
            
            const modal = document.getElementById('survived-modal');
            modal.classList.remove('hidden');
            
            const letterModal = document.getElementById('letter-board-modal');
            letterModal.classList.add('hidden');
            
            survivedEnergy.innerText = energyRemaining + '/30';
            const minutes = Math.floor(timeToSolve / 60);
            const seconds = timeToSolve % 60;
            survivedTime.innerText = `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
          }
        }
        
        if (message.type === 'toggleLevelSelection') {
          const buttonContainer = document.getElementById('button-container');
          
          if (buttonContainer.classList.contains('hidden')) {
            buttonContainer.classList.remove('hidden');
          } else {
            buttonContainer.classList.add('hidden');
          }
        }
      }
    });
    
    //game over confirmation buttons
    const aarghBtn = document.getElementById('aargh-button');
    const ahoyBtn = document.getElementById('ahoy-button');
    [aarghBtn, ahoyBtn].forEach((btn) => btn.addEventListener('click', handleGameOverButtonClick));
    
    //Aye-aye
    const ayeAyeBtn = document.getElementById('aye-aye-button');
    ayeAyeBtn.addEventListener('click', handleAyeAye);
    
    // How to Play
    const openModalBtn = document.getElementById('btn-how-to-play');
    openModalBtn.addEventListener('click', () => {
      const modal = document.getElementById('how-to-play-modal');
      modal.classList.remove('hidden');
      
      const closeModalBtn = document.getElementById('how-to-play-x-button');
      closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    });
    
    //Solve
    const solveBtn = document.getElementById('solve-button');
    solveBtn.addEventListener('click', handleSolveButtonClick)
    
    const solveXBtn = document.getElementById('letter-board-x-button');
    solveXBtn.addEventListener('click', () => {
      resetSolveBoard();
      resetLetterDisplay();
    });
  }
}

new App();
