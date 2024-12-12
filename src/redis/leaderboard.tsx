import { Devvit } from '@devvit/public-api';

const getLeaderboard = async (context: Devvit.Context) => {
  const currUser = await context.reddit.getCurrentUser();
  const currUsername = currUser?.username || 'anon';
  
  await context.redis.zAdd('leaderboard', {score: 420, member: currUsername});
  
  console.log("redis leaderboard", context.redis.get('leaderboard'));
}
