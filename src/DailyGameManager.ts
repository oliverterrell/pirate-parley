import { Devvit, RedisClient } from '@devvit/public-api';

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

class DailyGameManager {
  private redis: RedisClient;
  
  constructor(redis: RedisClient) {
    this.redis = redis;
  }
  
  private getCurrentDay(): string {
    // Get Pacific time
    const date = new Date();
    const pacificDate = new Date(date.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles'
    }));
    
    // If it's before 4 AM Pacific, use previous day
    if (pacificDate.getHours() < 4) {
      pacificDate.setDate(pacificDate.getDate() - 1);
    }
    
    return pacificDate.toISOString().split('T')[0];
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
    const currentDay = this.getCurrentDay();
    const gameKey = `game:${currentDay}`;
    
    // Try to get existing game
    let game = await this.redis.get(gameKey);
    
    if (!game) {
      // Generate new game if none exists
      game = await this.generateDailyGame(currentDay);
      // Store for 48 hours (enough to cover leaderboard viewing period)
      await this.redis.set(gameKey, JSON.stringify(game), { ex: 48 * 60 * 60 });
    } else {
      game = JSON.parse(game);
    }
    
    return game as GameState;
  }
  
  async getYesterdayLeaderboard(): Promise<PlayerScore[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const leaderboardKey = `leaderboard:${yesterday.toISOString().split('T')[0]}`;
    
    const leaderboard = await this.redis.get(leaderboardKey);
    return leaderboard ? JSON.parse(leaderboard) : [];
  }
  
  async recordScore(username: string, score: number): Promise<void> {
    const currentDay = this.getCurrentDay();
    const leaderboardKey = `leaderboard:${currentDay}`;
    const userCompletionKey = `completion:${currentDay}:${username}`;
    
    // Check if user already completed today's challenge
    const hasCompleted = await this.redis.get(userCompletionKey);
    if (hasCompleted) {
      return;
    }
    
    // Record completion
    await this.redis.set(userCompletionKey, 'true', { ex: 48 * 60 * 60 });
    
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
    await this.redis.set(leaderboardKey, JSON.stringify(topScores), { ex: 48 * 60 * 60 });
  }
  
  async hasPlayerCompletedToday(username: string): Promise<boolean> {
    const currentDay = this.getCurrentDay();
    const userCompletionKey = `completion:${currentDay}:${username}`;
    return !!(await this.redis.get(userCompletionKey));
  }
}
