import { RedisClient } from '@devvit/public-api';
import { GameBoard } from './DailyGameManager.js';

interface PlayerPosition {
  row: number;
  col: number;
}

interface PlayerProgress {
  position: PlayerPosition;
  collectedPowerUps: string[];
  openedChests: PlayerPosition[];
  foundLetters: string[];
  moves: number;
  startTime: number;
  lastSaved: number;
}

class GameStateManager {
  private readonly redis: RedisClient;
  
  constructor(redis: RedisClient) {
    this.redis = redis;
  }
  
  private getCurrentDay(): string {
    const date = new Date();
    const pacificDate = new Date(date.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles'
    }));
    
    if (pacificDate.getHours() < 4) {
      pacificDate.setDate(pacificDate.getDate() - 1);
    }
    
    return pacificDate.toISOString().split('T')[0];
  }
  
  // Get game state for current day
  async getDailyGame(): Promise<GameBoard | null> {
    const currentDay = this.getCurrentDay();
    const gameKey = `game:${currentDay}`;
    
    const gameState = await this.redis.get(gameKey);
    return gameState ? JSON.parse(gameState) : null;
  }
  
  // Store a new daily game
  async setDailyGame(gameState: GameBoard): Promise<void> {
    const currentDay = this.getCurrentDay();
    const gameKey = `game:${currentDay}`;
    
    await this.redis.set(gameKey, JSON.stringify(gameState), { ex: 48 * 60 * 60 });
  }
  
  // Initialize player progress for today's game
  async initializePlayerProgress(username: string, startPosition: PlayerPosition): Promise<void> {
    const currentDay = this.getCurrentDay();
    const progressKey = `progress:${currentDay}:${username}`;
    
    // Check if progress already exists
    const existingProgress = await this.redis.get(progressKey);
    if (existingProgress) {
      return; // Don't overwrite existing progress
    }
    
    const initialProgress: PlayerProgress = {
      position: startPosition,
      collectedPowerUps: [],
      openedChests: [],
      foundLetters: [],
      moves: 0,
      startTime: Date.now(),
      lastSaved: Date.now()
    };
    
    await this.redis.set(progressKey, JSON.stringify(initialProgress), { ex: 48 * 60 * 60 });
  }
  
  // Get player's current progress
  async getPlayerProgress(username: string): Promise<PlayerProgress | null> {
    const currentDay = this.getCurrentDay();
    const progressKey = `progress:${currentDay}:${username}`;
    
    const progress = await this.redis.get(progressKey);
    return progress ? JSON.parse(progress) : null;
  }
  
  // Update player progress
  async updatePlayerProgress(username: string, updates: Partial<PlayerProgress>): Promise<void> {
    const currentDay = this.getCurrentDay();
    const progressKey = `progress:${currentDay}:${username}`;
    
    const currentProgress = await this.getPlayerProgress(username);
    if (!currentProgress) {
      throw new Error('No progress found for player');
    }
    
    const updatedProgress: PlayerProgress = {
      ...currentProgress,
      ...updates,
      lastSaved: Date.now()
    };
    
    await this.redis.set(progressKey, JSON.stringify(updatedProgress), { ex: 48 * 60 * 60 });
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
    const currentDay = this.getCurrentDay();
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
    const completionKey = `completion:${currentDay}:${username}`;
    await this.redis.set(completionKey, JSON.stringify(completionData), { expiration: 48 * 60 * 60 });
  }
}