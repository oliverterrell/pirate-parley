export const DateManager = {
  getGameDate(): Date {
    const utcDate = new Date();
    
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
  
  formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  
  getGameDateString(): string {
    return DateManager.formatDateString(DateManager.getGameDate());
  },
  
  getPreviousGameDateString(daysBack: number = 1): string {
    const currentDate = DateManager.getGameDate();
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - daysBack);
    return DateManager.formatDateString(previousDate);
  }
};