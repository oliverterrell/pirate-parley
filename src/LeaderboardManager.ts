import { Context } from '@devvit/public-api';
import { DateManager } from './DateManager.js';

interface PlayerScore {
  username: string;
  score: number;
  timeToSolve: number;
  energyRemaining: number;
}

export const LeaderboardManager = {
  getLeaderboardKey: (dateString: string): string => {
    return `leaderboard:${dateString}`;
  },
  
  addScore: async (context: Context, playerScore: PlayerScore): Promise<void> => {
    const currentDate = DateManager.getGameDateString();
    const leaderboardKey = LeaderboardManager.getLeaderboardKey(currentDate);
    
    // Get current leaderboard
    const leaderboard = await LeaderboardManager.getLeaderboard(context, currentDate);
    
    const existingScoreIndex = leaderboard.findIndex(entry => entry.username === playerScore.username);
    if (existingScoreIndex >= 0) {
      if (playerScore.score > leaderboard[existingScoreIndex].score) {
        leaderboard[existingScoreIndex] = playerScore;
      }
    } else {
      leaderboard.push(playerScore);
    }
    
    leaderboard.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.timeToSolve - b.timeToSolve;
    });
    
    await context.redis.set(leaderboardKey, JSON.stringify(leaderboard));
  },
  
  getLeaderboard: async (context: Context, date: string): Promise<PlayerScore[]> => {
    const leaderboardKey = LeaderboardManager.getLeaderboardKey(date);
    const leaderboardData = await context.redis.get(leaderboardKey);
    return leaderboardData ? JSON.parse(leaderboardData) : [];
  },
  
  getPreviousDayLeaderboard: async (context: Context): Promise<PlayerScore[]> => {
    const previousDate = DateManager.getPreviousGameDateString();
    return await LeaderboardManager.getLeaderboard(context, previousDate);
  },
  
  getPlayerRank: (leaderboard: PlayerScore[], username: string): number => {
    const index = leaderboard.findIndex(entry => entry.username === username);
    return index >= 0 ? index + 1 : -1;
  }
}