import { RedisClient } from '@devvit/public-api';
import { GameBoard } from './GameManager.js';
import { DateManager } from './DateManager.js';

interface BoardPosition {
  row: number;
  col: number;
}

interface PlayerProgress {
  position: BoardPosition;
  energyRemaining: number;
  collectedPowerUps: string[];
  openedChests: BoardPosition[];
  foundLetters: string[];
  moves: number;
  startTime: number;
  lastSaved: number;
}

class PlayerGameStateManager {
  private readonly redis: RedisClient;
  
  constructor(redis: RedisClient) {
    this.redis = redis;
  }
  
  // Get game state for current day
  async getDailyGame(): Promise<GameBoard | null> {
    const currentDateString = DateManager.getCurrentDateString();
    const gameKey = `game:${currentDateString}`;
    
    const gameState = await this.redis.get(gameKey);
    return gameState ? JSON.parse(gameState) : null;
  }
  
  // Store a new daily game
  async setDailyGame(gameState: GameBoard): Promise<void> {
    const currentDateString = DateManager.getCurrentDateString();
    const gameKey = `game:${currentDateString}`;
    
    await this.redis.set(gameKey, JSON.stringify(gameState), { expiration: DateManager.get2DaysFromNow() });
  }
  
  // Initialize player progress for today's game
  async initializePlayerProgress(username: string, startPosition: BoardPosition): Promise<void> {
    const currentDateString = DateManager.getCurrentDateString();
    const progressKey = `progress:${currentDateString}:${username}`;
    
    // Check if progress already exists
    const existingProgress = await this.redis.get(progressKey);
    if (existingProgress) {
      return; // Don't overwrite existing progress
    }
    
    const initialProgress: PlayerProgress = {
      position: startPosition,
      energyRemaining: 30,
      collectedPowerUps: [],
      openedChests: [],
      foundLetters: [],
      moves: 0,
      startTime: Date.now(),
      lastSaved: Date.now()
    };
    
    await this.redis.set(progressKey, JSON.stringify(initialProgress), { expiration: DateManager.get2DaysFromNow() });
  }
  
  // Get player's current progress
  async getPlayerProgress(username: string): Promise<PlayerProgress | null> {
    const currentDateString = DateManager.getCurrentDateString();
    const progressKey = `progress:${currentDateString}:${username}`;
    
    const progress = await this.redis.get(progressKey);
    return progress ? JSON.parse(progress) : null;
  }
  
  // Update player progress
  async updatePlayerProgress(username: string, updates: Partial<PlayerProgress>): Promise<void> {
    const currentDateString = DateManager.getCurrentDateString();
    const progressKey = `progress:${currentDateString}:${username}`;
    
    const currentProgress = await this.getPlayerProgress(username);
    if (!currentProgress) {
      await this.initializePlayerProgress(username, { row: 0, col: 0 });
    }
    
    const updatedProgress: PlayerProgress = {
      ...currentProgress,
      ...updates,
      lastSaved: Date.now()
    };
    
    await this.redis.set(progressKey, JSON.stringify(updatedProgress), { expiration: DateManager.get2DaysFromNow() });
  }
  
  // Check if player has completed today's game
  async hasPlayerCompletedToday(username: string): Promise<boolean> {
    const progress = await this.getPlayerProgress(username);
    const game = await this.getDailyGame();
    
    if (!progress || !game) return false;
    
    // Game is complete if all letters are found
    return progress.foundLetters.length === game.word.length;
  }
  
  // Record final completion
  async recordCompletion(username: string): Promise<void> {
    const currentDateString = DateManager.getCurrentDateString();
    const progress = await this.getPlayerProgress(username);
    
    if (!progress) {
      throw new Error('No progress found for player');
    }
    
    const completionData = {
      moves: progress.moves,
      timeSpent: Date.now() - progress.startTime,
      powerUpsUsed: progress.collectedPowerUps.length,
      chestsOpened: progress.openedChests.length
    };
    
    // Store completion data
    const completionKey = `completion:${currentDateString}:${username}`;
    await this.redis.set(completionKey, JSON.stringify(completionData), { expiration: DateManager.get2DaysFromNow() });
  }
}