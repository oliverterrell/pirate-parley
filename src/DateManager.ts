export const DateManager =  {
  getCurrentDate(): Date {
    const date = new Date();
    const pacificDate = new Date(date.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles'
    }));
    
    if (pacificDate.getHours() < 4) {
      pacificDate.setDate(pacificDate.getDate() - 1);
    }
    
    return pacificDate;
  },
  
  getCurrentDateString(): string {
    return this.getCurrentDate().toISOString().split('T')[0];
  },
  
  get2DaysFromNow(): Date {
    const date = this.getCurrentDate();
    date.setDate(date.getDate() + 2);
    return date;
  }
}
