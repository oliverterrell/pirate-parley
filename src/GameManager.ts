import { Devvit, RedisClient } from '@devvit/public-api';
import { DateManager } from './DateManager.js';

// Types for our game elements
interface CellContent {
  background?: 'grass' | 'water' | 'sand';
  powerUp?: 'speed' | 'jump' | 'shield';
  blocker?: boolean;
  chest?: boolean;
}

export interface GameBoard {
  word: string;
  board: {
    [key: `r${number}`]: {
      [key: `c${number}`]: CellContent;
    };
  };
}

interface GameState {
  words: string[];
  powerUps: Coordinate[];
  blockages: Coordinate[];
  chests: Coordinate[];
  day: string; // YYYY-MM-DD format
}

interface Coordinate {
  x: number;
  y: number;
}

interface PlayerScore {
  username: string;
  score: number;
  timeCompleted: number;
}

class GameManager {
  private redis: RedisClient;
  
  constructor(redis: RedisClient) {
    this.redis = redis;
  }
  
  private async generateDailyGame(day: string): Promise<GameState> {
    // Use the day string as seed for deterministic randomization
    const seed = day.split('-').join('');
    
    // Generate game elements based on seed
    // This is where you'd implement your specific generation logic
    return {
      words: ['example', 'words'], // Generate based on seed
      powerUps: [{ x: 1, y: 1 }], // Generate based on seed
      blockages: [{ x: 2, y: 2 }], // Generate based on seed
      chests: [{ x: 3, y: 3 }], // Generate based on seed
      day
    };
  }
  
  async getCurrentGame(): Promise<GameState> {
    const currentDateString = DateManager.getCurrentDateString();
    const gameKey = `game:${currentDateString}`;
    
    // Try to get existing game
    let existingGame = await this.redis.get(gameKey);
    let game: GameState;
    
    if (!existingGame) {
      // Generate new game if none exists
      game = await this.generateDailyGame(currentDateString);
      // Store for 48 hours (enough to cover leaderboard viewing period)
      await this.redis.set(gameKey, JSON.stringify(game), { expiration: DateManager.get2DaysFromNow() });
    } else {
      game = JSON.parse(existingGame);
    }
    
    return game;
  }
  
  async getYesterdayLeaderboard(): Promise<PlayerScore[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const leaderboardKey = `leaderboard:${yesterday.toISOString().split('T')[0]}`;
    
    const leaderboard = await this.redis.get(leaderboardKey);
    return leaderboard ? JSON.parse(leaderboard) : [];
  }
  
  async recordScore(username: string, score: number): Promise<void> {
    const currentDateString = DateManager.getCurrentDateString();
    const leaderboardKey = `leaderboard:${currentDateString}`;
    const userCompletionKey = `completion:${currentDateString}:${username}`;
    
    // Check if user already completed today's challenge
    const hasCompleted = await this.redis.get(userCompletionKey);
    if (hasCompleted) {
      return;
    }
    
    // Record completion
    await this.redis.set(userCompletionKey, 'true', { expiration: DateManager.get2DaysFromNow() });
    
    // Update leaderboard
    let leaderboard = await this.redis.get(leaderboardKey);
    const scores: PlayerScore[] = leaderboard ? JSON.parse(leaderboard) : [];
    
    scores.push({
      username,
      score,
      timeCompleted: Date.now()
    });
    
    // Sort by score (highest first) and time (earliest first)
    scores.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.timeCompleted - b.timeCompleted;
    });
    
    // Keep top 100 scores
    const topScores = scores.slice(0, 100);
    
    // Store for 48 hours
    await this.redis.set(leaderboardKey, JSON.stringify(topScores), { expiration: DateManager.get2DaysFromNow() });
  }
  
  async hasPlayerCompletedToday(username: string): Promise<boolean> {
    const currentDateString = DateManager.getCurrentDateString();
    const userCompletionKey = `completion:${currentDateString}:${username}`;
    return !!(await this.redis.get(userCompletionKey));
  }
}
