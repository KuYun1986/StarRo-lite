// 活動管理員設定區。上線時填入 Firebase 專案「網頁應用程式」組態。
// 未填寫時自動使用「本機試玩模式」，可立即體驗全部打擊玩法。
window.BASEBALL_CONFIG = {
  // 正式活動的開始日（台灣時間）。活動連續 7 個自然日。
  eventStart: '2026-10-09',
  eventDays: 7,
  eventId: 'starro-derby-2026-10',
  dailyAttempts: 10,
  firebase: {
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    appId: ''
  }
};
