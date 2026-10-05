// 以台灣時區（Asia/Taipei）計算今天的日期，格式 YYYY-MM-DD
export function todayTW() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
}
