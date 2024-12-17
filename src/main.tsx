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
    allGames: Record<string, any>,
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
}

Devvit.configure({
  redditAPI: true,
  redis: true,
});


Devvit.addSchedulerJob({
  name: 'new-day',
  onRun: async (event, context) => {
    const dayNumberKey = `day`;
    const dayNumber = await context.redis.get(dayNumberKey);
    const currentDay = Number(dayNumber || 0);
    
    await context.redis.set(dayNumberKey, (currentDay + 1).toString());
    
    const currentDateString = DateManager.getGameDateString();
    const gameKey = `game:${currentDateString}`;
    
    const gameData = Object.values(games)[currentDay % Object.values(games).length];
    
    if (gameData) {
      await context.redis.set(gameKey, JSON.stringify(gameData));
    } else {
      await context.redis.set(gameKey, JSON.stringify(games.aargh_1));
    }
  }
});

Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (_, context) => {
    console.log("[devdrbo] app installed")
    try {
      const jobId = await context.scheduler.runJob({
        cron: '0 11 * * *',
        name: 'new-day',
      });
      await context.redis.set('newDayCronId', jobId);
    } catch (e) {
      console.log('error was not able to schedule:', e);
      throw e;
    }
  },
});

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
          await context.redis.set(positionKey, JSON.stringify(msg.data.playerPosition));
          await context.redis.set(energyKey, msg.data.playerEnergy.toString());
          await context.redis.set(visitedSquaresKey, msg.data.visitedSquares.join('|'));
          await context.redis.set(partialWordKey, game.word.split('').map(_ => '_').join(''));
          await context.redis.set(guessedLettersKey, '')
          
          context.ui.webView.postMessage('myWebView', {
            type: 'initialData',
            data: {
              playerEnergy: msg.data.playerEnergy,
              visitedSquares: msg.data.visitedSquares,
              playerPosition: msg.data.playerPosition,
              gameMap: msg.data.game.board,
              wordLength: msg.data.game.word.length,
              guessedLetters: [],
              partialWord: game.word.split('').map(_ => '_').join(''),
              allGames: games
            },
          });
          
          setPlayerEnergy(msg.data.playerEnergy);
          setVisitedSquares(msg.data.visitedSquares);
          setPlayerPosition(msg.data.playerPosition)
          setPartialWord(game.word.split('').map(_ => '_').join(''));
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
          
          for (let i = 0; i < word.length; i++) {
            if (word[i] === letter) {
              partialWordArray[i] = letter;
            }
          }
          
          const newPartialWord = partialWordArray.join('');
          
          await context.redis.set(guessedLettersKey, msg.data.guessedLetters.join(''));
          await context.redis.set(partialWordKey, newPartialWord);
          
          context.ui.webView.postMessage('myWebView', {
            type: 'guessLetter',
            data: {
              guessedLetters: msg.data.guessedLetters,
              partialWord: newPartialWord
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
          username: username,
          playerPosition,
          playerEnergy: Number(playerEnergy),
          gameMap: game.board,
          wordLength: game.word.length,
          visitedSquares,
          partialWord,
          guessedLetters,
          allGames: games,
        },
      });
    };
    
    // Render the custom post type
    return (
      <vstack grow padding="small">
        <Welcome
          gameComplete={gameComplete}
          webviewVisible={webviewVisible}
          username={username}
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
