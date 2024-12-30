export const ScoreManager = {
  getScoreBonuses: ({ elapsedTime, energyRemaining }) => {
    let timeBonus = 0;
    if (elapsedTime < 300) {
      timeBonus = 50;
    } else if (elapsedTime < 600) {
      timeBonus = 20;
    }
    
    return { timeBonus, energyBonus: energyRemaining };
  },
  
  
}
