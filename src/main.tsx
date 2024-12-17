import './createPost.js';

import { Devvit, useState } from '@devvit/public-api';
import { DateManager } from './DateManager.js';
import * as games from './gameDict.js';
import { Welcome } from "./Welcome.js"

// Defines the messages that are exchanged between Devvit and Web View
type WebViewMessage =
  | {
  type: 'initialData';
  data: {
    username: string;
    currentCounter: number,
    playerPosition: { row: number, col: number },
    playerEnergy: number;
    gameMap: { [key: string]: { [key: string]: string } },
    wordLength: number;
    visitedSquares: string[];
    allGames?: Record<string, any>,
    guessedLetters: string[];
    partialWord: string;
  };
}
  | {
  type: 'movePlayer';
  data: {
    playerEnergy: number;
    playerPosition: { row: number, col: number }
    visitedSquares: string[]
  };
}
  | {
  type: 'guessLetter';
  data: {
    letter: string;
    guessedLetters: string[];
    partialWord: string
  };
}
  | {
  type: 'reset';
  data: {
    game: Record<string, any>,
    playerPosition: { row: number, col: number },
    playerEnergy: number,
    visitedSquares: string[]
  };
} | {
  type: 'hideWebView'
} | {
  type: 'completeGame'
} | {
  type: 'toggleLevelSelection'
}

Devvit.configure({
  redditAPI: true,
  redis: true,
});


Devvit.addSchedulerJob({
  name: 'new-day',
  onRun: async (_, context) => {
    const dayNumberKey = `day`;
    const dayNumber = await context.redis.get(dayNumberKey);
    let currentDay = Number(dayNumber || 1) % (Object.keys(games).length + 1);
    
    if (currentDay === 0) {
      currentDay = 1;
    }
    
    await context.redis.set(dayNumberKey, (currentDay + 1).toString());
    
    const currentDateString = DateManager.getGameDateString();
    const gameKey = `game:${currentDateString}`;
    
    const gameData = Object.values(games).find(game => game.dayNum === currentDay);
    
    if (gameData) {
      await context.redis.set(gameKey, JSON.stringify(gameData));
    } else {
      await context.redis.set(gameKey, JSON.stringify(games.aargh_1));
    }
    
    console.log('currentDay', currentDay);
    console.log('currentDate', currentDateString);
    console.log('gameData', gameData);
  }
});

Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (_, context) => {
    
    console.log("\n[devdrbo] app installed\n")
    
    const jobId = await context.scheduler.runJob({
      cron: '0 11 * * *',
      name: 'new-day',
    });
    await context.redis.set('newDayCronId', jobId);
    
  },
});

Devvit.addMenuItem({
  description: "Show/hide level selection buttons",
  label: "Toggle level selection (mod only)",
  location: "post",
  forUserType: "moderator",
  onPress: async (_, context) => {
    context.ui.webView.postMessage('myWebView', {
      type: 'toggleLevelSelection',
      data: {
        allGames: games
      }
    });
  }
})

// Add a custom post type to Devvit
Devvit.addCustomPostType({
  name: "Pirate's Parley",
  height: 'tall',
  render: (context) => {
    // Load username with `useAsync` hook
    const [username] = useState(async () => {
      const currUser = await context.reddit.getCurrentUser();
      return currUser?.username ?? 'anon';
    });
    
    const currentDateString = DateManager.getGameDateString();
    const gameKey = `game:${currentDateString}`;
    const positionKey = `position:${currentDateString}:${username}`;
    const energyKey = `energy:${currentDateString}:${username}`;
    const scoreKey = `score:${currentDateString}:${username}`;
    const visitedSquaresKey = `visited:${currentDateString}:${username}`;
    const guessedLettersKey = `guessed:${currentDateString}:${username}`;
    const partialWordKey = `partial:${currentDateString}:${username}`;
    const gameCompleteKey = `complete:${currentDateString}:${username}`;
    
    const [game] = useState(async () => {
      const game = await context.redis.get(gameKey);
      return game ? JSON.parse(game) : games.aargh_1;
    });
    
    const [gameComplete, setGameComplete] = useState(async () => {
      const gameComplete = await context.redis.get(gameCompleteKey);
      return gameComplete ? JSON.parse(gameComplete) : false;
    })
    
    const [playerPosition, setPlayerPosition] = useState(async () => {
      const playerPosition = await context.redis.get(positionKey);
      return playerPosition ? JSON.parse(playerPosition) : {row: 1, col: 1};
    })
    
    const [playerEnergy, setPlayerEnergy] = useState(async () => {
      const playerEnergy = await context.redis.get(energyKey);
      return Number(playerEnergy ?? 30);
    })
    
    const [playerScore, setPlayerScore] = useState(async () => {
      const playerScore = await context.redis.get(scoreKey);
      return Number(playerScore ?? 0);
    })
    
    const [visitedSquares, setVisitedSquares] = useState(async () => {
      const visitedSquares = await context.redis.get(visitedSquaresKey);
      return visitedSquares ? visitedSquares.split('|') : [];
    })
    
    const [guessedLetters, setGuessedLetters] = useState(async () => {
      const guessedLetters = await context.redis.get(guessedLettersKey);
      return guessedLetters ? guessedLetters.split('') : [];
    });
    
    const [partialWord, setPartialWord] = useState<string>(async () => {
      const partialWord = await context.redis.get(partialWordKey);
      return partialWord ?? game.word.split('').map(_ => '_').join('');
    })
    
    const [webviewVisible, setWebviewVisible] = useState(false);
    
    // When the web view invokes `window.parent.postMessage` this function is called
    const onMessage = async (msg: WebViewMessage) => {
      switch (msg.type) {
        case 'reset':
          console.log("reset game state")
          const gameMap = msg.data.game ? msg.data.game.board : game.board;
          const wordLength = msg.data.game ? msg.data.game.word.length : game.word.length;
          const allGames = msg.data.game ? games : null;
          
          await context.redis.set(positionKey, JSON.stringify({row: 1, col: 1}));
          await context.redis.set(energyKey, '30');
          await context.redis.set(visitedSquaresKey, [].join('|'));
          await context.redis.set(partialWordKey, new Array(wordLength).fill('_').join(''));
          await context.redis.set(guessedLettersKey, '')
          await context.redis.set(scoreKey, '0');
          
          context.ui.webView.postMessage('myWebView', {
            type: 'initialData',
            data: {
              playerScore: 0,
              playerEnergy: 30,
              visitedSquares: [],
              playerPosition: {row: 1, col: 1},
              gameMap,
              wordLength,
              guessedLetters: [],
              allGames,
              partialWord: game.word.split('').map(_ => '_').join(''),
              reset: true,
            },
          });
          
          setPlayerScore(0);
          setPlayerEnergy(30);
          setVisitedSquares([]);
          setPlayerPosition({row: 1, col: 1})
          setPartialWord(new Array(wordLength).fill('_').join(''));
          setGuessedLetters([])
          break;
        case 'movePlayer':
          console.log('move player', msg.data.playerPosition, 'Energy:', msg.data.playerEnergy);
          
          await context.redis.set(positionKey, JSON.stringify(msg.data.playerPosition));
          await context.redis.set(energyKey, msg.data.playerEnergy.toString());
          await context.redis.set(visitedSquaresKey, msg.data.visitedSquares.join('|'))
          
          context.ui.webView.postMessage('myWebView', {
            type: 'movePlayerResponse',
            data: {
              playerPosition: msg.data.playerPosition,
              playerEnergy: msg.data.playerEnergy,
              visitedSquares: msg.data.visitedSquares
            },
          });
          
          setPlayerPosition(msg.data.playerPosition);
          setPlayerEnergy(msg.data.playerEnergy);
          setVisitedSquares(msg.data.visitedSquares);
          break;
        case 'guessLetter': {
          console.log("guessing letter", msg.data.letter);
          
          const word = game.word.toLowerCase();
          const letter = msg.data.letter.toLowerCase();
          
          let partialWordArray = partialWord.split('');
          
          const occurrences = word.split('').filter(char => char === letter).length;
          const newScore = playerScore + (occurrences * 10);
          
          if (occurrences > 0) {
            await context.redis.set(scoreKey, newScore.toString());
            setPlayerScore(newScore);
          }
          
          for (let i = 0; i < word.length; i++) {
            if (word[i] === letter) {
              partialWordArray[i] = letter;
            }
          }
          
          const newPartialWord = partialWordArray.join('');
          
          await context.redis.set(guessedLettersKey, msg.data.guessedLetters.join(''));
          await context.redis.set(partialWordKey, newPartialWord);
          
          
          if (newPartialWord === word) {
            //todo handle game complete
          }
          
          context.ui.webView.postMessage('myWebView', {
            type: 'guessLetter',
            data: {
              guessedLetters: msg.data.guessedLetters,
              partialWord: newPartialWord,
              playerScore: newScore
            },
          });
          
          setGuessedLetters(msg.data.guessedLetters);
          setPartialWord(newPartialWord);
          break;
        }
        
        case 'completeGame':
          await context.redis.set(gameCompleteKey, 'true');
          setGameComplete(true);
          break;
        
        case 'hideWebView':
          setWebviewVisible(false);
          break;
        
        
        case 'initialData':
        case 'toggleLevelSelection':
          break;
        default:
          throw new Error(`Unknown message type: ${msg satisfies never}`);
      }
    };
    
    // When the button is clicked, send initial data to web view and show it
    const onShowWebviewClick = () => {
      // if (gameComplete) return;
      
      setWebviewVisible(true);
      context.ui.webView.postMessage('myWebView', {
        type: 'initialData',
        data: {
          playerScore,
          username,
          playerPosition,
          playerEnergy: Number(playerEnergy),
          gameMap: game.board,
          wordLength: game.word.length,
          visitedSquares,
          partialWord,
          guessedLetters,
          allGames: games
        },
      });
    };
    
    // Render the custom post type
    return (
      <vstack grow padding="small">
        <Welcome
          username={username}
          gameComplete={gameComplete}
          webviewVisible={webviewVisible}
          onShowWebviewClick={onShowWebviewClick}
        />
        <vstack grow={webviewVisible} height={webviewVisible ? '100%' : '0%'}>
          <vstack border="thick" borderColor="black" height={webviewVisible ? '100%' : '0%'}>
            <webview
              id="myWebView"
              url="page.html"
              onMessage={(msg) => onMessage(msg as WebViewMessage)}
              grow
              height={webviewVisible ? '100%' : '0%'}
            />
          </vstack>
        </vstack>
      </vstack>
    );
  },
});

export default Devvit;
