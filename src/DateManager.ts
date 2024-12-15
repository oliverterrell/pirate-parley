export const DateManager = {
  getGameDate(): Date {
    const utcDate = new Date();
    
    // Get Pacific time offset
    const pacificTime = utcDate.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour12: false
    });
    const pacificDate = new Date(pacificTime);
    
    // Handle early morning rollback
    if (pacificDate.getHours() < 4) {
      pacificDate.setDate(pacificDate.getDate() - 1);
    }
    
    // Create date with correct timezone offset
    return new Date(
      pacificDate.getFullYear(),
      pacificDate.getMonth(),
      pacificDate.getDate(),
      pacificDate.getHours(),
      pacificDate.getMinutes(),
      pacificDate.getSeconds()
    );
  },
  
  getGameDateString(): string {
    const date = DateManager.getGameDate();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
};