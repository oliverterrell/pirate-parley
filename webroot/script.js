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
    if (pos.row >= 1 && pos.row <= 8 && pos.col >= 1 && pos.col <= 13) {
      const ringSquare = document.querySelector(`div[data-position="${pos.row},${pos.col}"]`);
      ringSquares.push(ringSquare);
    }
  }
  
  const plusSquares = [];
  for (let pos of plusPositions) {
    if (pos.row >= 1 && pos.row <= 8 && pos.col >= 1 && pos.col <= 13) {
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

let isInitialPosition = true;
let currentHandlers = null;
let currentPosition = null;
let currentEnergy = null;
let currentGameMap = null;
let visitedSquares = null;
let isProcessingMove = false;

const updateMapDisplay = () => {
  if (!currentGameMap) return;
  
  // Clear existing map items
  document.querySelectorAll('.map-item').forEach(item => item.remove());
  
  // Loop through the board and add items
  Object.entries(currentGameMap.board).forEach(([row, cols]) => {
    const rowNum = parseInt(row.substring(1)); // Get number from "r1", "r2" etc
    
    Object.entries(cols).forEach(([col, item]) => {
      const colNum = parseInt(col.substring(1)); // Get number from "c1", "c2" etc
      const square = document.querySelector(`div[data-position="${rowNum},${colNum}"]`);
      
      if (square && !visitedSquares.has(`${rowNum},${colNum}`)) {
        // Add appropriate class and content based on item type
        const itemElement = document.createElement('div');
        itemElement.classList.add('map-item', `map-item-${item}`);
        
        // Add appropriate image or content based on item type
        switch(item) {
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
          default:
            break;
        }
        
        square.appendChild(itemElement);
      } else if (item === 'chest' && visitedSquares.has(`${rowNum},${colNum}`)) {
        const itemElement = document.createElement('div');
        itemElement.classList.add('map-item', `map-item-${item}`);
        itemElement.innerHTML = '<img src="assets/chest.png" alt="chest" width="29" height="29" style="opacity: 0.4" />';
        square.appendChild(itemElement);
      }
    });
  });
};
const handleLeaveSquare = (position) => {
  if ((currentGameMap.board?.['r' + position.row]?.['c' + position.col] || null) === 'chest') {
    const square = document.querySelector(`div[data-position="${position.row},${position.col}"]`);
    square.innerHTML = '<img src="assets/chest.png" alt="chest" width="29" height="29" style="opacity: 0.4" />';
  }
}

const handleEnterSquare = (position) => {
  const squareType = currentGameMap.board?.['r' + position.row]?.['c' + position.col] ?? null;
  const playerEnergy = document.querySelector('#player-energy');
  
  console.log(squareType);
  
  if (!visitedSquares.has(position.row + ',' + position.col)) {
    visitedSquares.add(position.row + ',' + position.col);
    switch (squareType) {
      case 'chest':
        currentEnergy -= 1;
        playerEnergy.classList.add('red-text');
        playerEnergy.classList.remove('green-text');
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
      default:
        playerEnergy.classList.add('red-text');
        playerEnergy.classList.remove('green-text');
        currentEnergy -= 1;
        break;
    }
  } else {
    playerEnergy.classList.add('red-text');
    playerEnergy.classList.remove('green-text');
    currentEnergy -= 1;
  }

  playerEnergy.innerText = currentEnergy;
}

// Update the movePlayer function:
const movePlayer = async (newPosition, oldPosition) => {
  // Don't process new moves if we're already processing one
  if (isProcessingMove) {
    console.log('Move already processing, ignoring new move request');
    return;
  }

  try {
    isProcessingMove = true;
    
    // Make sure currentEnergy is initialized
    if (currentEnergy === null) {
      currentEnergy = 30;
    }
    
    // Don't allow movement if no energy left (except for initial positioning)
    if (currentEnergy <= 0 && !arePositionsEqual(newPosition, oldPosition) && !isInitialPosition) {
      return;
    }
    
    // For initial position, we need to clean up even though there's no currentHandlers yet
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
    
    // Clean up old handlers if they exist
    if (currentHandlers) {
      cleanupPosition(oldPosition, currentHandlers);
    }
    
    // Initialize new position and store new handlers
    currentHandlers = initPlayer(newPosition, oldPosition);
    
    // Only update energy and notify parent if this was triggered by user interaction
    // and the position actually changed
    if (!arePositionsEqual(newPosition, oldPosition)) {
      if (!isInitialPosition) {
        handleLeaveSquare(oldPosition)
        handleEnterSquare(newPosition);
      }
      
      // Add visual processing indicator
      const overlay = document.createElement('div');
      overlay.className = 'move-processing-overlay';
      document.body.appendChild(overlay);
      
      // Post message and wait for response
      await new Promise((resolve) => {
        const messageHandler = (ev) => {
          const {type, data} = ev.data;
          if (type === 'devvit-message' &&
            data.message.type === 'movePlayer' &&
            arePositionsEqual(data.message.data.playerPosition, newPosition)) {
            window.removeEventListener('message', messageHandler);
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
      
      // Remove processing indicator
      document.querySelector('.move-processing-overlay')?.remove();
    }
    
    currentPosition = newPosition;
  } finally {
    isProcessingMove = false;
  }
};

class App {
  constructor() {
    const citrusButton = document.querySelector('#btn-increase');
    const playerScore = document.querySelector('#player-score');
    const playerEnergy = document.querySelector('#player-energy');
    
    let counter = 0;
    
    // When the Devvit app sends a message with `context.ui.webView.postMessage`, this will be triggered
    window.addEventListener('message', (ev) => {
      const {type, data} = ev.data;
      
      // `context.ui.webView.postMessage` posted from main.tsx
      if (type === 'devvit-message') {
        const {message} = data;
        
        // Load initial data
        if (message.type === 'initialData') {
          console.log('Initial data received:', message.data);
          const {
            username,
            currentCounter,
            playerPosition,
            playerEnergy: redisPlayerEnergy,
            gameMap,
            visitedSquares: redisVisitedSquares
          } = message.data;
          
          // Store game map
          currentGameMap = gameMap;
          visitedSquares = new Set(redisVisitedSquares || []);
          
          // Update map display
          updateMapDisplay();
          
          playerScore.innerText = counter = currentCounter;
          
          // Set initial energy from stored value (convert to number to be safe)
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
            (playerPosition || { row: 1, col: 1 });
          
          // Initialize player at stored position
          if (!currentPosition || !arePositionsEqual(currentPosition, position)) {
            movePlayer(position, currentPosition || position);
          }
        }
        
        if (message.type === 'movePlayer') {
          const {playerPosition, playerEnergy: newEnergy} = message.data;
          
          currentEnergy = newEnergy;
          
          if ((currentEnergy > 0 || arePositionsEqual(currentPosition, playerPosition)) &&
            playerPosition &&
            (!currentPosition || !arePositionsEqual(currentPosition, playerPosition))) {
            movePlayer(playerPosition, currentPosition || playerPosition);
          }
        }
        
        // Update counter
        if (message.type === 'updateCounter') {
          const {currentCounter} = message.data;
          playerScore.innerText = counter = currentCounter;
        }
      }
    });
    
    //dev use
    citrusButton.addEventListener('click', () => {
      // Sends a message to the Devvit app
      window.parent?.postMessage(
        {type: 'setCounter', data: {newCounter: Number(counter + 1), playerEnergy: 30, visitedSquares: []}},
        '*'
      );
    });
    
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
  }
}

new App();
