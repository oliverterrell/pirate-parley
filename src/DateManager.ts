export const DateManager = {
  getCurrentDate(): Date {
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
  
  getCurrentDateString(): string {
    const date = DateManager.getCurrentDate();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  
  get2DaysFromNow(): Date {
    const date = DateManager.getCurrentDate();
    date.setDate(date.getDate() + 2);
    return date;
  }
};