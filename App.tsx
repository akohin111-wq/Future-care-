
import React, { useState, useEffect } from 'react';
import { User, UserRole, SystemSettings, Payment, Attendance, Expense, Notice, Notification, Result, AdmissionApplication } from './types';
import { CENTER_NAME, DEVELOPER_INFO, ABSENT_FINE_AMOUNT, DAILY_LATE_FEE_AMOUNT, PAYMENT_DEADLINE_DAY } from './constants';
import LoginPage from './views/LoginPage';
import OwnerDashboard from './views/OwnerDashboard';
import TeacherDashboard from './views/TeacherDashboard';
import StudentDashboard from './views/StudentDashboard';
import Footer from './components/Footer';
import Header from './components/Header';
import { db } from './services/db';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [admissionApplications, setAdmissionApplications] = useState<AdmissionApplication[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    absentFineEnabled: true,
    lateFeeEnabled: true,
    guardianSmsEnabled: true,
    allStudentFineEnabled: true,
    monthlyFineUpdateEnabled: true,
    paymentMethods: [
      { id: '1', name: 'Bkash', number: '01773387091' },
      { id: '2', name: 'Nagad/Rocket', number: '01773503607' }
    ],
    disabledAttendanceDates: [],
    fridayMarkingEnabled: false
  });

  // Initial Data Fetch
  useEffect(() => {
    const initData = async () => {
      try {
        const [
          dbUsers,
          dbPayments,
          dbAttendances,
          dbResults,
          dbExpenses,
          dbNotifications,
          dbApplications,
          dbNotices,
          dbSettings
        ] = await Promise.all([
          db.getUsers(),
          db.getPayments(),
          db.getAttendances(),
          db.getResults(),
          db.getExpenses(),
          db.getNotifications(),
          db.getAdmissionApplications(),
          db.getNotices(),
          db.getSettings()
        ]);

        if (dbUsers.length > 0) {
          console.log("Loaded users from local storage:", dbUsers.length);
          setUsers(dbUsers);
        } else {
          console.log("No users found, seeding initial accounts...");
          // Seed initial accounts if DB is empty
          const initialOwner: User = { 
            id: '1744602517', 
            name: 'O H I H (Owner)', 
            role: UserRole.OWNER, 
            password: 'Ohin1234@', 
            status: 'active',
            createdAt: '2025-01-01'
          };
          const initialTeacher: User = {
            id: 'teacher1',
            name: 'Default Teacher',
            role: UserRole.TEACHER,
            password: 'pass123',
            status: 'active',
            createdAt: '2025-01-01'
          };
          const initialStudent: User = {
            id: 'student1',
            name: 'Default Student',
            role: UserRole.STUDENT,
            password: 'pass123',
            batch: 'Class 10',
            status: 'active',
            createdAt: '2025-01-01'
          };
          const initialUsers = [initialOwner, initialTeacher, initialStudent];
          setUsers(initialUsers);
          await db.saveUsers(initialUsers);
        }

        setPayments(dbPayments);
        setAttendances(dbAttendances);
        setResults(dbResults);
        setExpenses(dbExpenses);
        setNotifications(dbNotifications);
        setAdmissionApplications(dbApplications);
        
        if (dbNotices.length > 0) setNotices(dbNotices);
        else {
          const initialNotice: Notice = {
            id: '1',
            title: 'Welcome to Future Care Coaching Center',
            content: 'Important: Please verify your contact details. All guardians will receive SMS alerts for attendance starting this month.',
            timestamp: Date.now(),
            author: 'Owner'
          };
          setNotices([initialNotice]);
          await db.saveNotice(initialNotice);
        }

        if (dbSettings) setSettings(dbSettings);
      } catch (error) {
        console.error("Error loading data from Supabase:", error);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Persistence Hooks
  useEffect(() => { if (!loading && users.length > 0) db.saveUsers(users); }, [users, loading]);
  useEffect(() => { if (!loading && payments.length > 0) db.savePayments(payments); }, [payments, loading]);
  useEffect(() => { if (!loading && attendances.length > 0) db.saveAttendances(attendances); }, [attendances, loading]);
  useEffect(() => { if (!loading) db.saveSettings(settings); }, [settings, loading]);
  useEffect(() => { if (!loading && notifications.length > 0) db.saveNotifications(notifications); }, [notifications, loading]);
  useEffect(() => { if (!loading && results.length > 0) db.saveResults(results); }, [results, loading]);
  useEffect(() => { if (!loading && expenses.length > 0) db.saveExpenses(expenses); }, [expenses, loading]);
  useEffect(() => { if (!loading && admissionApplications.length > 0) db.saveAdmissionApplications(admissionApplications); }, [admissionApplications, loading]);
  useEffect(() => { if (!loading && notices.length > 0) db.saveNotices(notices); }, [notices, loading]);

  // Calculate Attendance Rate (Rolling 30 Days)
  const calculateAttendanceRate = (studentId: string) => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const relevantAttendances = attendances.filter(a => {
      const attDate = new Date(a.date);
      return a.studentId === studentId && attDate >= thirtyDaysAgo && attDate <= today;
    });

    if (relevantAttendances.length === 0) return 0;

    const presentCount = relevantAttendances.filter(a => a.status === 'PRESENT').length;
    return (presentCount / relevantAttendances.length) * 100;
  };

  const handleResetAttendance = () => {
    if (confirm("Are you sure? This will wipe ALL attendance history and reset rates to 0% for everyone.")) {
      setAttendances([]);
      db.deleteAttendances().catch(console.error);
    }
  };

  /**
   * Monthly Due Auto Reset System Logic
   * Calculates fees cumulatively. On the 1st of every month, 
   * the 'monthsToBill' count increases, effectively adding a new monthly fee.
   */
  const calculateFees = (studentId: string) => {
    const student = users.find(u => u.id === studentId);
    if (!student || student.role !== UserRole.STUDENT || student.status !== 'active') return { monthly: 0, late: 0, absent: 0, total: 0, lastMonthFines: 0 };

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed (Jan=0)

    // Determine billing start point (Academic Year)
    const academicYearStart = student.academicYear ? parseInt(student.academicYear) : currentYear;
    
    // We calculate the number of months the student is liable for from Jan of their academic year to today.
    // This handles the "1st of next month" auto-reset requirement.
    const monthsDiff = (currentYear - academicYearStart) * 12 + (currentMonth - 0);
    const monthsToBill = Math.max(1, monthsDiff + 1); // Minimum 1 month, inclusive of current month
    
    const totalTuitionOwed = monthsToBill * (student.monthlyFee || 0);

    // Sum of all APPROVED payments (tuition + fines)
    const approvedPayments = payments.filter(p => 
      p.studentId === studentId && 
      (p.status === 'APPROVED' || !p.status)
    );
    
    // Total amount credited to the student's account
    const totalPaidTowardsBalance = approvedPayments.reduce((acc, curr) => acc + curr.amount + curr.finePaid, 0);
    
    // Total adjustments (discounts/waivers)
    const totalAdjustments = approvedPayments
      .filter(p => p.type === 'ADJUSTMENT')
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Fines (Absent) - Calculated across ALL history, but only after creation day
    const totalAbsentCount = attendances.filter(a => {
      if (a.studentId !== studentId || a.status !== 'ABSENT') return false;
      if (!student.createdAt) return true; // Fallback for legacy users
      return a.date > student.createdAt; // Only count fines from the next day onwards
    }).length;
    const totalAbsentFines = settings.absentFineEnabled ? totalAbsentCount * ABSENT_FINE_AMOUNT : 0;

    // Late Fee Calculation (Daily 50 BDT after 10th if balance is outstanding)
    let currentLateFee = 0;
    if (settings.monthlyFineUpdateEnabled && settings.lateFeeEnabled) {
      const isBalanceOutstanding = (totalPaidAmountWithoutAdjustments(approvedPayments) + totalAdjustments) < (totalTuitionOwed + totalAbsentFines);
      if (isBalanceOutstanding && today.getDate() > PAYMENT_DEADLINE_DAY) {
        const daysLate = today.getDate() - PAYMENT_DEADLINE_DAY;
        currentLateFee = daysLate * DAILY_LATE_FEE_AMOUNT;
      }
    }

    // Final Calculation: (Total Fees + All Absent Fines + Current Late Fee) - Total Payments
    const netDue = Math.max(0, (totalTuitionOwed + totalAbsentFines + currentLateFee) - (totalPaidTowardsBalance + totalAdjustments));

    // For display breakdown in UI
    const tuitionRemaining = Math.max(0, totalTuitionOwed - (approvedPayments.filter(p => p.type === 'FEES' || p.type === 'BOTH').reduce((a,b) => a + b.amount, 0) + totalAdjustments));
    
    return {
      monthly: tuitionRemaining,
      late: currentLateFee,
      absent: totalAbsentFines,
      total: netDue,
      lastMonthFines: 0 // Legacy field, kept for compatibility
    };
  };

  const totalPaidAmountWithoutAdjustments = (payments: Payment[]) => {
    return payments
      .filter(p => p.type !== 'ADJUSTMENT')
      .reduce((acc, curr) => acc + curr.amount + curr.finePaid, 0);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (user && user.id === updatedUser.id) {
      setUser(updatedUser);
    }
  };

  const handleLogin = (id: string, pass: string) => {
    const trimmedId = id.trim();
    const trimmedPass = pass.trim();
    const found = users.find(u => u.id === trimmedId && u.password === trimmedPass);
    if (found) {
      if (found.role === UserRole.OWNER && found.id !== '1744602517') {
        alert('Access Denied: Restricted Owner Identity.');
        return;
      }
      if (found.status === 'disabled') {
        alert('Access Denied: This account has been removed/disabled.');
        return;
      }
      setUser(found);
    } else {
      alert('Authentication Failed: Invalid ID or Password.');
    }
  };

  const handleLogout = () => setUser(null);

  const handleApplyAdmission = (application: Omit<AdmissionApplication, 'id' | 'timestamp'>) => {
    const newApp: AdmissionApplication = {
      ...application,
      id: 'APP' + Date.now(),
      timestamp: Date.now()
    };
    setAdmissionApplications(prev => [newApp, ...prev]);
    alert("Application Submitted Successfully! Our team will contact you soon.");
  };

  const addNotification = (userId: string, title: string, message: string) => {
    const newNotif: Notification = {
      id: Date.now().toString(),
      userId,
      title,
      message,
      timestamp: Date.now(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Payment Approval Handlers
  const handleApprovePayment = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;
    
    setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'APPROVED' } : p));
    addNotification(payment.studentId, "Payment Approved", `Your online payment of ৳${payment.amount + payment.finePaid} has been verified and approved.`);
    alert("Payment Approved Successfully.");
  };

  const handleRejectPayment = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'REJECTED' } : p));
    addNotification(payment.studentId, "Payment Rejected", `Your online payment of ৳${payment.amount + payment.finePaid} was rejected. Please contact office with valid TrxID.`);
    alert("Payment Rejected.");
  };

  const handleRemoveNotice = (id: string) => {
    if (confirm("Delete this notice?")) {
      setNotices(prev => prev.filter(n => n.id !== id));
      db.deleteNotice(id).catch(console.error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Initializing Secure Database...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} onApplyAdmission={handleApplyAdmission} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} onLogout={handleLogout} />
      
      <main className="flex-grow container mx-auto p-4 max-w-7xl">
        {user.role === UserRole.OWNER && (
          <OwnerDashboard 
            users={users} 
            setUsers={setUsers} 
            payments={payments} 
            setPayments={setPayments}
            expenses={expenses}
            setExpenses={setExpenses}
            attendances={attendances}
            results={results}
            notices={notices}
            setNotices={setNotices}
            settings={settings}
            setSettings={setSettings}
            calculateFees={calculateFees}
            addNotification={addNotification}
            calculateAttendanceRate={calculateAttendanceRate}
            handleResetAttendance={handleResetAttendance}
            onApprovePayment={handleApprovePayment}
            onRejectPayment={handleRejectPayment}
            onRemoveNotice={handleRemoveNotice}
            admissionApplications={admissionApplications}
          />
        )}
        {user.role === UserRole.TEACHER && (
          <TeacherDashboard 
            user={user}
            users={users}
            attendances={attendances}
            setAttendances={setAttendances}
            results={results}
            setResults={setResults}
            notices={notices}
            settings={settings}
          />
        )}
        {user.role === UserRole.STUDENT && (
          <StudentDashboard 
            user={user}
            users={users}
            attendances={attendances}
            payments={payments}
            setPayments={setPayments}
            results={results}
            notices={notices}
            notifications={notifications}
            setNotifications={setNotifications}
            calculateFees={calculateFees}
            settings={settings}
            calculateAttendanceRate={calculateAttendanceRate}
            onUpdateUser={handleUpdateUser}
          />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default App;
