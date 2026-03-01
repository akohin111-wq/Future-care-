import { User, Payment, Attendance, Result, Expense, Notice, Notification, SystemSettings, AdmissionApplication, Salary, DashboardHistory } from '../types';

const STORAGE_KEYS = {
  USERS: 'fccc_users',
  PAYMENTS: 'fccc_payments',
  ATTENDANCES: 'fccc_attendances',
  RESULTS: 'fccc_results',
  EXPENSES: 'fccc_expenses',
  NOTICES: 'fccc_notices',
  NOTIFICATIONS: 'fccc_notifications',
  APPLICATIONS: 'fccc_applications',
  SETTINGS: 'fccc_settings',
  SALARIES: 'fccc_salaries',
  DASHBOARD_HISTORY: 'fccc_dashboard_history'
};

const getLocal = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const saveLocal = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const db = {
  // Users
  async getUsers() {
    return getLocal<User[]>(STORAGE_KEYS.USERS, []);
  },
  async saveUser(user: User) {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index > -1) users[index] = user;
    else users.push(user);
    saveLocal(STORAGE_KEYS.USERS, users);
  },
  async saveUsers(users: User[]) {
    saveLocal(STORAGE_KEYS.USERS, users);
  },

  // Payments
  async getPayments() {
    return getLocal<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
  },
  async savePayment(payment: Payment) {
    const payments = await this.getPayments();
    payments.push(payment);
    saveLocal(STORAGE_KEYS.PAYMENTS, payments);
  },
  async savePayments(payments: Payment[]) {
    saveLocal(STORAGE_KEYS.PAYMENTS, payments);
  },

  // Attendances
  async getAttendances() {
    return getLocal<Attendance[]>(STORAGE_KEYS.ATTENDANCES, []);
  },
  async saveAttendance(attendance: Attendance) {
    const attendances = await this.getAttendances();
    attendances.push(attendance);
    saveLocal(STORAGE_KEYS.ATTENDANCES, attendances);
  },
  async saveAttendances(attendances: Attendance[]) {
    saveLocal(STORAGE_KEYS.ATTENDANCES, attendances);
  },
  async deleteAttendances() {
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCES);
  },

  // Results
  async getResults() {
    return getLocal<Result[]>(STORAGE_KEYS.RESULTS, []);
  },
  async saveResult(result: Result) {
    const results = await this.getResults();
    results.push(result);
    saveLocal(STORAGE_KEYS.RESULTS, results);
  },
  async saveResults(results: Result[]) {
    saveLocal(STORAGE_KEYS.RESULTS, results);
  },

  // Expenses
  async getExpenses() {
    return getLocal<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  },
  async saveExpense(expense: Expense) {
    const expenses = await this.getExpenses();
    expenses.push(expense);
    saveLocal(STORAGE_KEYS.EXPENSES, expenses);
  },
  async saveExpenses(expenses: Expense[]) {
    saveLocal(STORAGE_KEYS.EXPENSES, expenses);
  },

  // Notices
  async getNotices() {
    return getLocal<Notice[]>(STORAGE_KEYS.NOTICES, []);
  },
  async saveNotice(notice: Notice) {
    const notices = await this.getNotices();
    const index = notices.findIndex(n => n.id === notice.id);
    if (index > -1) notices[index] = notice;
    else notices.push(notice);
    saveLocal(STORAGE_KEYS.NOTICES, notices);
  },
  async saveNotices(notices: Notice[]) {
    saveLocal(STORAGE_KEYS.NOTICES, notices);
  },
  async deleteNotice(id: string) {
    const notices = await this.getNotices();
    saveLocal(STORAGE_KEYS.NOTICES, notices.filter(n => n.id !== id));
  },

  // Notifications
  async getNotifications() {
    return getLocal<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  },
  async saveNotification(notification: Notification) {
    const notifications = await this.getNotifications();
    notifications.push(notification);
    saveLocal(STORAGE_KEYS.NOTIFICATIONS, notifications);
  },
  async saveNotifications(notifications: Notification[]) {
    saveLocal(STORAGE_KEYS.NOTIFICATIONS, notifications);
  },

  // Admission Applications
  async getAdmissionApplications() {
    return getLocal<AdmissionApplication[]>(STORAGE_KEYS.APPLICATIONS, []);
  },
  async saveAdmissionApplication(application: AdmissionApplication) {
    const applications = await this.getAdmissionApplications();
    applications.push(application);
    saveLocal(STORAGE_KEYS.APPLICATIONS, applications);
  },
  async saveAdmissionApplications(applications: AdmissionApplication[]) {
    saveLocal(STORAGE_KEYS.APPLICATIONS, applications);
  },

  // Settings
  async getSettings() {
    return getLocal<SystemSettings | null>(STORAGE_KEYS.SETTINGS, null);
  },
  async saveSettings(settings: SystemSettings) {
    saveLocal(STORAGE_KEYS.SETTINGS, settings);
  },

  // Salaries
  async getSalaries() {
    return getLocal<Salary[]>(STORAGE_KEYS.SALARIES, []);
  },
  async saveSalary(salary: Salary) {
    const salaries = await this.getSalaries();
    salaries.push(salary);
    saveLocal(STORAGE_KEYS.SALARIES, salaries);
  },
  async saveSalaries(salaries: Salary[]) {
    saveLocal(STORAGE_KEYS.SALARIES, salaries);
  },

  // Dashboard History
  async getDashboardHistory() {
    return getLocal<DashboardHistory[]>(STORAGE_KEYS.DASHBOARD_HISTORY, []);
  },
  async saveDashboardHistory(history: DashboardHistory) {
    const histories = await this.getDashboardHistory();
    histories.push(history);
    saveLocal(STORAGE_KEYS.DASHBOARD_HISTORY, histories);
  },
  async saveDashboardHistories(histories: DashboardHistory[]) {
    saveLocal(STORAGE_KEYS.DASHBOARD_HISTORY, histories);
  }
};
