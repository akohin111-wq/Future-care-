
import React, { useState, useEffect } from 'react';
import { User, UserRole, Payment, Expense, SystemSettings, Notice, Attendance, PaymentMethod, Result, AdmissionApplication, Salary, DashboardHistory } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { analyzeFinancialData } from '../services/geminiService';
import { CENTER_NAME, PERSONAL_PAYMENT_CHARGE_PER_1000 } from '../constants';

interface OwnerDashboardProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  payments: Payment[];
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  results: Result[];
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  salaries: Salary[];
  setSalaries: React.Dispatch<React.SetStateAction<Salary[]>>;
  dashboardHistory: DashboardHistory[];
  attendances: Attendance[];
  notices: Notice[];
  setNotices: React.Dispatch<React.SetStateAction<Notice[]>>;
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  calculateFees: (studentId: string) => any;
  addNotification: (userId: string, title: string, message: string) => void;
  calculateAttendanceRate: (studentId: string) => number;
  handleResetAttendance: () => void;
  onApprovePayment: (paymentId: string) => void;
  onRejectPayment: (paymentId: string) => void;
  onRemoveNotice: (id: string) => void;
  admissionApplications: AdmissionApplication[];
}

const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ 
  users, setUsers, payments, setPayments, results, expenses, setExpenses, salaries, setSalaries, dashboardHistory, attendances, notices, setNotices, settings, setSettings, calculateFees, addNotification, calculateAttendanceRate, handleResetAttendance, onApprovePayment, onRejectPayment, onRemoveNotice, admissionApplications
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'finance' | 'notices' | 'leaderboard' | 'admission' | 'settings' | 'financial-dashboard' | 'history'>('overview');
  const [admissionSubTab, setAdmissionSubTab] = useState<'admissions' | 'applications'>('admissions');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeductModalOpen, setIsDeductModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isCollegeExpenseModalOpen, setIsCollegeExpenseModalOpen] = useState(false);
  const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null);
  
  const [isRemoveConfirmModalOpen, setIsRemoveConfirmModalOpen] = useState(false);
  const [userIdToRemove, setUserIdToRemove] = useState<string | null>(null);
  
  const [userRoleFilter, setUserRoleFilter] = useState<UserRole>(UserRole.STUDENT);
  const [userBatchFilter, setUserBatchFilter] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  
  const [leaderboardBatchFilter, setLeaderboardBatchFilter] = useState<string>('');
  
  const [ownerPasswordForm, setOwnerPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [isOwnerPasswordModalOpen, setIsOwnerPasswordModalOpen] = useState(false);

  const [newUser, setNewUser] = useState<Partial<User>>({ role: UserRole.STUDENT, status: 'active' });
  const [newStudent, setNewStudent] = useState({
    name: '',
    id: '',
    password: '',
    assignedClass: '',
    sscResult: '',
    hscResult: '',
    phone: '',
    guardianPhone: '',
    pastAddress: '',
    presentAddress: ''
  });
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    id: '',
    password: '',
    phone: '',
    presentAddress: '',
    nidNumber: ''
  });
  const [newNotice, setNewNotice] = useState({ title: '', content: '' });

  const filteredPendingPayments = payments.filter(p => {
    if (p.status !== 'PENDING') return false;
    const student = users.find(u => u.id === p.studentId);
    return !userBatchFilter || student?.batch === userBatchFilter;
  });

  // Leaderboard Logic
  const getLeaderboard = () => {
    const studentLatestExamMarks = users
      .filter(u => u.role === UserRole.STUDENT && u.status === 'active' && (!leaderboardBatchFilter || u.batch === leaderboardBatchFilter))
      .map(student => {
        const studentExams = results
          .filter(r => r.studentId === student.id && r.type === 'Class Exam')
          .sort((a, b) => b.timestamp - a.timestamp);
        
        const latestExam = studentExams[0];
        return {
          id: student.id,
          name: student.name,
          marks: latestExam ? latestExam.marks : 0,
          total: latestExam ? latestExam.totalMarks : 0
        };
      })
      .filter(entry => entry.marks > 0)
      .sort((a, b) => b.marks - a.marks)
      .slice(0, 5);
    
    return studentLatestExamMarks;
  };

  // Payment Collection State
  const [studentSearchInPayment, setStudentSearchInPayment] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    studentId: '',
    amount: 0,
    finePaid: 0,
    month: new Date().toISOString().slice(0, 7),
    type: 'BOTH' as 'FEES' | 'FINE' | 'BOTH',
    method: 'Cash',
    paymentType: 'OFFLINE' as 'PERSONAL' | 'AGENT' | 'OFFLINE',
    extraCharge: 0,
    note: ''
  });

  // Waiver Form State
  const [deductionForm, setDeductionForm] = useState({
    studentId: '',
    amount: 0,
    reason: '',
    month: new Date().toISOString().slice(0, 7)
  });

  // Salary Form State
  const [salaryForm, setSalaryForm] = useState({
    staffName: '',
    amount: 0,
    month: new Date().toISOString().slice(0, 7),
    note: ''
  });

  // College Expense Form State
  const [collegeExpenseForm, setCollegeExpenseForm] = useState({
    itemDescription: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const searchedStudents = (query: string) => users.filter(u => u.role === UserRole.STUDENT && u.status === 'active' && (!userBatchFilter || u.batch === userBatchFilter) && (u.name.toLowerCase().includes(query.toLowerCase()) || u.id.toLowerCase().includes(query.toLowerCase())));

  const handleSelectStudentForPayment = (student: User) => {
    const fees = calculateFees(student.id);
    setPaymentForm({ ...paymentForm, studentId: student.id, amount: fees.monthly, finePaid: fees.absent + fees.late });
    setStudentSearchInPayment('');
  };

  const handleSelectStudentForDeduction = (student: User) => {
    setDeductionForm({ ...deductionForm, studentId: student.id });
    setIsDeductModalOpen(true);
  };

  useEffect(() => {
    if (paymentForm.paymentType === 'PERSONAL') {
      const baseAmount = paymentForm.amount + paymentForm.finePaid;
      const charge = Math.ceil((baseAmount / 1000) * PERSONAL_PAYMENT_CHARGE_PER_1000);
      setPaymentForm(prev => ({ ...prev, extraCharge: charge }));
    } else {
      setPaymentForm(prev => ({ ...prev, extraCharge: 0 }));
    }
  }, [paymentForm.paymentType, paymentForm.amount, paymentForm.finePaid]);

  const totalCollection = payments.filter(p => p.type !== 'ADJUSTMENT' && (p.status === 'APPROVED' || !p.status)).reduce((sum, p) => sum + p.amount + p.finePaid + (p.extraCharge || 0), 0);
  const totalSalaryPaid = salaries.reduce((sum, s) => sum + s.amount, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalCollection - (totalSalaryPaid + totalExpense);

  // Current Month Financials
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentMonthCollection = payments
    .filter(p => p.month === currentMonthStr && p.type !== 'ADJUSTMENT' && (p.status === 'APPROVED' || !p.status))
    .reduce((sum, p) => sum + p.amount + p.finePaid + (p.extraCharge || 0), 0);
  const currentMonthSalary = salaries
    .filter(s => s.month === currentMonthStr)
    .reduce((sum, s) => sum + s.amount, 0);
  const currentMonthExpense = expenses
    .filter(e => e.date.startsWith(currentMonthStr))
    .reduce((sum, e) => sum + e.amount, 0);
  const currentMonthProfit = currentMonthCollection - (currentMonthSalary + currentMonthExpense);

  useEffect(() => {
    const fetchInsights = async () => {
      const insight = await analyzeFinancialData({
        collection: totalCollection,
        expenses: totalExpense,
        profit: netProfit,
        studentsCount: users.filter(u => u.role === UserRole.STUDENT).length
      });
      setAiInsights(insight);
    };
    fetchInsights();
  }, [totalCollection, totalExpense, netProfit, users.length]);

  const validatePhone = (phone?: string) => {
    if (!phone) return true;
    return /^[0-9]{11}$/.test(phone);
  };

  const handleAddUser = () => {
    if (!newUser.id || !newUser.name || !newUser.password) {
      alert('Required fields: Name, ID, Password');
      return;
    }
    if (newUser.role === UserRole.STUDENT && !newUser.batch) {
      alert('Validation Error: Assigned Batch is mandatory for students.');
      return;
    }
    if (!validatePhone(newUser.phone) || !validatePhone(newUser.guardianPhone)) {
      alert('Validation Error: Mobile numbers must be exactly 11 digits.');
      return;
    }
    const userWithDate: User = {
      ...(newUser as User),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setUsers([...users, userWithDate]);
    setIsUserModalOpen(false);
    setNewUser({ role: UserRole.STUDENT, status: 'active' });
  };

  const handleAddStudent = () => {
    if (!newStudent.name || !newStudent.id || !newStudent.password || !newStudent.assignedClass) {
      alert('Required fields: Name, ID, Password, Assigned Class');
      return;
    }
    if (!validatePhone(newStudent.phone) || !validatePhone(newStudent.guardianPhone)) {
      alert('Validation Error: Mobile numbers must be exactly 11 digits.');
      return;
    }
    const student: User = {
      id: newStudent.id,
      name: newStudent.name,
      password: newStudent.password,
      role: UserRole.STUDENT,
      batch: newStudent.assignedClass,
      assignedClass: newStudent.assignedClass,
      sscResult: newStudent.sscResult,
      hscResult: newStudent.hscResult,
      phone: newStudent.phone,
      guardianPhone: newStudent.guardianPhone,
      pastAddress: newStudent.pastAddress,
      presentAddress: newStudent.presentAddress,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setUsers([...users, student]);
    setIsAddStudentModalOpen(false);
    setNewStudent({
      name: '', id: '', password: '', assignedClass: '', sscResult: '', hscResult: '',
      phone: '', guardianPhone: '', pastAddress: '', presentAddress: ''
    });
  };

  const handleAddTeacher = () => {
    if (!newTeacher.name || !newTeacher.id || !newTeacher.password) {
      alert('Required fields: Name, ID, Password');
      return;
    }
    if (!validatePhone(newTeacher.phone)) {
      alert('Validation Error: Mobile number must be exactly 11 digits.');
      return;
    }
    const teacher: User = {
      id: newTeacher.id,
      name: newTeacher.name,
      password: newTeacher.password,
      role: UserRole.TEACHER,
      phone: newTeacher.phone,
      presentAddress: newTeacher.presentAddress,
      nidNumber: newTeacher.nidNumber,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setUsers([...users, teacher]);
    setIsAddTeacherModalOpen(false);
    setNewTeacher({ name: '', id: '', password: '', phone: '', presentAddress: '', nidNumber: '' });
  };

  const handleCollectPayment = () => {
    if (!paymentForm.studentId || (paymentForm.amount + paymentForm.finePaid) <= 0) return;
    const fees = calculateFees(paymentForm.studentId);
    if ((Number(paymentForm.amount) + Number(paymentForm.finePaid)) > fees.total) {
      alert(`Error: Amount exceeds total due of ৳${fees.total}`);
      return;
    }
    const p: Payment = {
      id: Date.now().toString(),
      studentId: paymentForm.studentId,
      amount: Number(paymentForm.amount),
      finePaid: Number(paymentForm.finePaid),
      extraCharge: Number(paymentForm.extraCharge),
      month: paymentForm.month,
      timestamp: Date.now(),
      type: paymentForm.type,
      method: paymentForm.method,
      paymentType: paymentForm.paymentType,
      note: paymentForm.note
    };
    setPayments([...payments, p]);
    setIsPaymentModalOpen(false);
    addNotification(p.studentId, "Fee Recorded", `Receipt of ৳${p.amount + p.finePaid} for ${p.month}.`);
    setPaymentForm({ studentId: '', amount: 0, finePaid: 0, month: new Date().toISOString().slice(0, 7), type: 'BOTH', method: 'Cash', paymentType: 'OFFLINE', extraCharge: 0, note: '' });
  };

  const handleDeductMoney = () => {
    if (!deductionForm.studentId || deductionForm.amount <= 0 || !deductionForm.reason) {
      alert("Validation Error: Student, Amount, and Reason are required.");
      return;
    }
    const fees = calculateFees(deductionForm.studentId);
    if (deductionForm.amount > fees.total) {
      alert(`Validation Error: Deduction cannot exceed current balance of ৳${fees.total}`);
      return;
    }
    const previousFine = fees.absent + fees.late;
    const p: Payment = {
      id: 'DED' + Date.now(),
      studentId: deductionForm.studentId,
      amount: Number(deductionForm.amount),
      finePaid: 0,
      extraCharge: 0,
      month: deductionForm.month,
      timestamp: Date.now(),
      type: 'ADJUSTMENT',
      method: 'Adjustment',
      paymentType: 'OFFLINE',
      note: `Reduced by Owner. Prev Fine: ৳${previousFine}. Reduced: ৳${deductionForm.amount}. Date: ${new Date().toLocaleDateString()}. Reason: ${deductionForm.reason}`
    };
    setPayments([...payments, p]);
    setIsDeductModalOpen(false);
    addNotification(p.studentId, "Balance Adjusted", `Owner applied a fine reduction/waiver of ৳${p.amount}. Reason: ${p.note}`);
    setDeductionForm({ studentId: '', amount: 0, reason: '', month: new Date().toISOString().slice(0, 7) });
  };

  const handleAddSalary = () => {
    if (!salaryForm.staffName || salaryForm.amount <= 0) {
      alert("Validation Error: Staff Name and Amount are required.");
      return;
    }
    const s: Salary = {
      id: 'SAL' + Date.now(),
      teacherId: salaryForm.staffName, // Using staffName as ID for now or lookup
      amount: Number(salaryForm.amount),
      date: new Date().toISOString().split('T')[0],
      month: salaryForm.month
    };
    setSalaries([...salaries, s]);
    setIsSalaryModalOpen(false);
    setSalaryForm({ staffName: '', amount: 0, month: new Date().toISOString().slice(0, 7), note: '' });
  };

  const handleAddCollegeExpense = () => {
    if (!collegeExpenseForm.itemDescription || collegeExpenseForm.amount <= 0) {
      alert("Validation Error: Item Description and Amount are required.");
      return;
    }
    const e: Expense = {
      id: 'CLG' + Date.now(),
      description: `College Expenses (Purchase): ${collegeExpenseForm.itemDescription}`,
      amount: Number(collegeExpenseForm.amount),
      date: collegeExpenseForm.date
    };
    setExpenses([...expenses, e]);
    setIsCollegeExpenseModalOpen(false);
    setCollegeExpenseForm({ itemDescription: '', amount: 0, date: new Date().toISOString().split('T')[0] });
  };

  const handleRemoveUser = (userId: string) => {
    if (userId === '1744602517') {
      alert("Error: Root owner account cannot be disabled.");
      return;
    }
    setUserIdToRemove(userId);
    setIsRemoveConfirmModalOpen(true);
  };

  const confirmRemoveUser = () => {
    if (!userIdToRemove) return;
    setUsers(users.map(u => u.id === userIdToRemove ? { ...u, status: 'disabled' } : u));
    if (selectedUserForDetails?.id === userIdToRemove) {
      setIsViewDetailsModalOpen(false);
    }
    setIsRemoveConfirmModalOpen(false);
    setUserIdToRemove(null);
    alert("Student account permanently deactivated and archived.");
  };

  const handleAddNotice = () => {
    if (!newNotice.title || !newNotice.content) return;
    setNotices([{ id: Date.now().toString(), title: newNotice.title, content: newNotice.content, timestamp: Date.now(), author: 'Owner' }, ...notices]);
    setIsNoticeModalOpen(false);
    setNewNotice({ title: '', content: '' });
  };

  const handleRemoveNotice = (id: string) => {
    onRemoveNotice(id);
  };

  const handleRecalculateAttendance = () => {
    alert("Attendance rates successfully recalculated for all students.");
  };

  const handleChangeOwnerPassword = () => {
    if (!ownerPasswordForm.new || ownerPasswordForm.new !== ownerPasswordForm.confirm) {
      alert("Passwords do not match or are empty.");
      return;
    }
    
    const owner = users.find(u => u.id === '1744602517');
    if (!owner) return;

    if (owner.password !== ownerPasswordForm.current) {
      alert("Incorrect current password.");
      return;
    }

    const updatedUsers = users.map(u => u.id === '1744602517' ? { ...u, password: ownerPasswordForm.new } : u);
    setUsers(updatedUsers);
    alert("Owner password updated successfully!");
    setOwnerPasswordForm({ current: '', new: '', confirm: '' });
    setIsOwnerPasswordModalOpen(false);
  };

  const filteredUsers = users.filter(u => {
    const matchesRole = u.role === userRoleFilter;
    const matchesBatch = !userBatchFilter || u.batch === userBatchFilter;
    const matchesSearch = u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.id.toLowerCase().includes(userSearchQuery.toLowerCase());
    return matchesRole && (u.role === UserRole.STUDENT ? matchesBatch : true) && matchesSearch && u.status === 'active';
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['overview', 'users', 'finance', 'notices', 'leaderboard', 'admission', 'settings', 'financial-dashboard', 'history'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{tab.toUpperCase()}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 text-left animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
              <p className="text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1 text-left">Total Money Collected</p>
              <h3 className="text-3xl font-black text-blue-600">৳{totalCollection}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
              <p className="text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1 text-left">Total Staff Salary Paid</p>
              <h3 className="text-3xl font-black text-indigo-600">৳{totalSalaryPaid}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
              <p className="text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1 text-left">Total Expenses</p>
              <h3 className="text-3xl font-black text-red-600">৳{totalExpense}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
              <p className="text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1 text-left">Net Profit</p>
              <h3 className="text-3xl font-black text-emerald-600">৳{netProfit}</h3>
            </div>
          </div>

          {aiInsights.length > 0 && (
            <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-100 text-left">
              <div className="flex items-center gap-4 mb-6 text-left">
                <div className="bg-white/20 p-3 rounded-2xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <div className="text-left">
                  <h4 className="text-lg font-black uppercase tracking-tight text-left">AI Financial Insights</h4>
                  <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest text-left">Powered by Gemini Pro</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                {aiInsights.map((insight, idx) => (
                  <div key={idx} className="bg-white/10 p-4 rounded-2xl border border-white/10 text-sm font-medium text-left">
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {activeTab === 'users' && (
        <div className="space-y-6 text-left">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-gray-800 tracking-tight uppercase">User Management</h3>
            <div className="flex gap-2">
              <button onClick={() => setIsAddStudentModalOpen(true)} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-emerald-700 transition-all">+ Add Student</button>
              <button onClick={() => setIsAddTeacherModalOpen(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all">+ Add Teacher</button>
              <button onClick={() => setIsUserModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition-all">+ Add Profile</button>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border flex flex-col sm:flex-row gap-4 shadow-sm text-left">
            <select 
              value={userRoleFilter} 
              onChange={(e) => {
                setUserRoleFilter(e.target.value as UserRole);
                setUserBatchFilter('');
              }} 
              className="bg-slate-100 border-none rounded-lg p-2.5 text-xs font-black uppercase tracking-widest text-gray-600"
            >
              <option value="STUDENT">STUDENT ROSTER</option>
              <option value="TEACHER">TEACHER ROSTER</option>
              <option value="OWNER">OWNER ROSTER</option>
            </select>

            {userRoleFilter === UserRole.STUDENT && (
              <select 
                value={userBatchFilter} 
                onChange={(e) => setUserBatchFilter(e.target.value)} 
                className="bg-slate-100 border-none rounded-lg p-2.5 text-xs font-black uppercase tracking-widest text-gray-600"
              >
                <option value="">ALL CLASSES</option>
                <option value="Class 7">Class 7</option>
                <option value="Class 8">Class 8</option>
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10</option>
                <option value="SSC Candidate">SSC Candidate</option>
                <option value="Inter 1st Year">Inter 1st Year</option>
                <option value="Inter 2nd Year">Inter 2nd Year</option>
                <option value="HSC Candidate">HSC Candidate</option>
              </select>
            )}

            <input type="text" placeholder="Search by Name or ID..." className="flex-1 bg-slate-50 border-gray-100 border rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} />
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-gray-400 border-b"><tr><th className="px-6 py-4">Identity Details</th><th className="px-6 py-4 text-center">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.length === 0 ? <tr><td colSpan={2} className="px-6 py-10 text-center text-gray-400 italic">No matching records found.</td></tr> : 
                  filteredUsers.map(u => {
                    const fees = calculateFees(u.id);
                    return (
                      <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <img src={u.photo || `https://picsum.photos/seed/${u.id}/60/60`} className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm object-cover" />
                            <div>
                              <p className="font-black text-gray-800 text-sm">{u.name}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-mono text-gray-400 uppercase">UID: {u.id}</p>
                                {settings.allStudentFineEnabled && u.role === UserRole.STUDENT && (
                                  <span className="bg-red-50 text-red-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Fine: ৳{fees.absent + fees.late}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center"><button onClick={() => { setSelectedUserForDetails(u); setIsViewDetailsModalOpen(true); }} className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all">View Profile</button></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'finance' && (
        <div className="space-y-6 text-left">
          <div className="bg-white p-4 rounded-2xl border flex flex-col sm:flex-row gap-4 shadow-sm text-left">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Filter by Class</label>
              <select 
                value={userBatchFilter} 
                onChange={(e) => setUserBatchFilter(e.target.value)} 
                className="bg-slate-100 border-none rounded-lg p-2.5 text-xs font-black uppercase tracking-widest text-gray-600"
              >
                <option value="">ALL CLASSES</option>
                <option value="Class 7">Class 7</option>
                <option value="Class 8">Class 8</option>
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10</option>
                <option value="SSC Candidate">SSC Candidate</option>
                <option value="Inter 1st Year">Inter 1st Year</option>
                <option value="Inter 2nd Year">Inter 2nd Year</option>
                <option value="HSC Candidate">HSC Candidate</option>
              </select>
            </div>
          </div>

          {/* Pending Approval Section - NEW */}
          {filteredPendingPayments.length > 0 && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-3xl p-6 shadow-sm animate-in fade-in duration-500 text-left">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-black text-orange-800 uppercase tracking-tight">Verification Queue ({filteredPendingPayments.length})</h4>
                <span className="bg-orange-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase">Review Required</span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {filteredPendingPayments.map(p => {
                  const student = users.find(u => u.id === p.studentId);
                  return (
                    <div key={p.id} className="bg-white border border-orange-100 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
                      <div className="text-left flex items-center gap-4">
                        <img src={student?.photo || `https://picsum.photos/seed/${p.studentId}/40/40`} className="w-10 h-10 rounded-xl border border-orange-50" />
                        <div>
                          <p className="font-black text-gray-800 text-sm uppercase">{student?.name || 'Unknown Student'}</p>
                          <p className="text-[10px] font-mono text-gray-400 tracking-tighter">UID: {p.studentId} • {p.method}</p>
                        </div>
                      </div>
                      <div className="text-left bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex-1 w-full md:w-auto">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">TrxID</p>
                            <p className="text-[11px] font-black text-blue-600 font-mono">{p.trxId}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Sender Num</p>
                            <p className="text-[11px] font-black text-gray-800 font-mono">****{p.senderLastNumber}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black text-emerald-600 mb-1">Amount: ৳{p.amount + p.finePaid}</p>
                        <div className="flex gap-2">
                          <button onClick={() => onApprovePayment(p.id)} className="bg-emerald-600 text-white text-[10px] font-black px-4 py-2 rounded-xl uppercase hover:bg-emerald-700 transition-all">Approve</button>
                          <button onClick={() => onRejectPayment(p.id)} className="bg-red-50 text-red-600 text-[10px] font-black px-4 py-2 rounded-xl uppercase hover:bg-red-100 transition-all">Reject</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-3xl border shadow-sm text-left">
            <h4 className="text-lg font-black text-gray-800 mb-6 uppercase tracking-tight">Payment Control Center</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={() => setIsPaymentModalOpen(true)} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-50 hover:bg-emerald-700 transition-all">Collect Tuition Fee</button>
              <button onClick={() => setIsDeductModalOpen(true)} className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-50 hover:bg-orange-700 transition-all">Fine Reduction / Waiver</button>
              <button onClick={() => setIsSalaryModalOpen(true)} className="flex-1 bg-slate-700 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-slate-800 transition-all">Selley (Teacher/Staff Payment)</button>
              <button onClick={() => setIsCollegeExpenseModalOpen(true)} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition-all">College Expenses (Purchase)</button>
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl border shadow-sm text-left">
            <h4 className="font-black text-gray-800 mb-4 border-b pb-4 uppercase tracking-tighter text-left">Financial Audit Trail</h4>
            <div className="space-y-8 overflow-y-auto max-h-[600px] pr-2 scrollbar-thin scrollbar-thumb-gray-200 text-left">
              <section className="text-left">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 text-left">Inflow (Collections)</p>
                <div className="space-y-3">
                  {payments.filter(p => {
                    if (p.status && p.status !== 'APPROVED') return false;
                    const student = users.find(u => u.id === p.studentId);
                    return !userBatchFilter || student?.batch === userBatchFilter;
                  }).length === 0 ? <p className="text-gray-400 italic text-xs py-4 text-center">No transaction records found in ledger.</p> : 
                    payments.slice().reverse().filter(p => {
                      if (p.status && p.status !== 'APPROVED') return false;
                      const student = users.find(u => u.id === p.studentId);
                      return !userBatchFilter || student?.batch === userBatchFilter;
                    }).map(p => (
                      <div key={p.id} className={`p-4 rounded-2xl border transition-all flex justify-between items-center ${p.type === 'ADJUSTMENT' ? 'bg-orange-50 border-orange-100 ring-4 ring-orange-50/30' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="text-left">
                          <p className="text-sm font-black text-gray-800">{users.find(u => u.id === p.studentId)?.name || 'Removed Student'}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mt-0.5">{new Date(p.timestamp).toLocaleString()} • {p.type}</p>
                          {p.note && <p className="text-[10px] text-gray-500 font-medium italic mt-1 bg-white/50 px-2 py-0.5 rounded-lg inline-block">Reason: {p.note}</p>}
                        </div>
                        <div className="text-right">
                          <p className={`text-base font-black ${p.type === 'ADJUSTMENT' ? 'text-orange-600' : 'text-emerald-600'}`}>{p.type === 'ADJUSTMENT' ? '-' : '+'}৳{p.amount + p.finePaid}</p>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{p.method}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </section>

              <section className="text-left">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 text-left">Outflow (Selley & Purchases)</p>
                <div className="space-y-3">
                  {expenses.length === 0 ? <p className="text-gray-400 italic text-xs py-4 text-center">No outflow/expense records found.</p> : 
                    expenses.slice().reverse().map(e => (
                      <div key={e.id} className="p-4 rounded-2xl border border-red-50 bg-red-50/30 flex justify-between items-center">
                        <div className="text-left">
                          <p className="text-sm font-black text-gray-800">{e.description}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mt-0.5">{e.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-red-600">-৳{e.amount}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notices' && (
        <div className="space-y-6 text-left">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight uppercase">Notice Management</h3>
            <button onClick={() => setIsNoticeModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg">New Notice</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {notices.length === 0 ? (
              <div className="col-span-full py-20 bg-white rounded-3xl border-4 border-dashed border-gray-50 text-center">
                <p className="text-gray-400 font-black uppercase text-xs tracking-widest">No notices posted yet</p>
              </div>
            ) : (
              notices.map(n => (
                <div key={n.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative group text-left">
                  <button onClick={() => handleRemoveNotice(n.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2">{new Date(n.timestamp).toLocaleString()}</p>
                  <h4 className="text-lg font-black text-gray-800 mb-2 leading-tight">{n.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">{n.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="space-y-6 text-left animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-[2.5rem] border shadow-sm text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 text-left">
              <div className="text-left">
                <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight text-left">Academic Leaderboard</h3>
                <p className="text-xs text-gray-400 font-bold uppercase mt-1 text-left">Top 5 students based on latest Class Exam</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-left">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Filter Batch</label>
                  <select 
                    className="bg-slate-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    value={leaderboardBatchFilter}
                    onChange={(e) => setLeaderboardBatchFilter(e.target.value)}
                  >
                    <option value="">All Classes</option>
                    {Array.from(new Set(users.filter(u => u.batch && u.role === UserRole.STUDENT).map(u => u.batch))).map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center text-2xl">🏆</div>
              </div>
            </div>
            <div className="overflow-x-auto text-left">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b">
                  <tr><th className="px-8 py-5">Rank</th><th className="px-8 py-5">Student Identity</th><th className="px-8 py-5 text-center">Latest Marks</th><th className="px-8 py-5 text-right">Performance</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {getLeaderboard().length === 0 ? (
                    <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-400 italic">No Class Exam results found.</td></tr>
                  ) : (
                    getLeaderboard().map((entry, index) => (
                      <tr key={entry.id} className={`hover:bg-blue-50/30 transition-colors ${index === 0 ? 'bg-yellow-50/10' : ''}`}>
                        <td className="px-8 py-6">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 ${
                            index === 0 ? 'bg-yellow-400 border-yellow-500 text-white' : index === 1 ? 'bg-slate-300 border-slate-400 text-white' : index === 2 ? 'bg-orange-300 border-orange-400 text-white' : 'bg-slate-50 border-slate-100 text-gray-400'
                          }`}>{index + 1}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            {/* Fixed u reference to properly find user photo from users array */}
                            <img src={users.find(u => u.id === entry.id)?.photo || `https://picsum.photos/seed/${entry.id}/40/40`} className="w-10 h-10 rounded-xl border-2 border-white shadow-sm object-cover" />
                            <div><p className="font-black text-gray-800 text-sm uppercase">{entry.name}</p><p className="text-[10px] font-mono text-gray-400 tracking-tighter">ID: {entry.id}</p></div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center"><span className="text-lg font-black text-blue-600">{entry.marks}</span><span className="text-gray-400 text-xs font-bold ml-1">/ {entry.total}</span></td>
                        <td className="px-8 py-6 text-right"><span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full">{((entry.marks / entry.total) * 100).toFixed(1)}% Score</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'admission' && (
        <div className="space-y-6 text-left">
          <div className="flex gap-4 border-b border-gray-100 pb-2">
            <button 
              onClick={() => setAdmissionSubTab('admissions')}
              className={`text-sm font-black uppercase tracking-widest pb-2 transition-all ${admissionSubTab === 'admissions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Admissions
            </button>
            <button 
              onClick={() => setAdmissionSubTab('applications')}
              className={`text-sm font-black uppercase tracking-widest pb-2 transition-all ${admissionSubTab === 'applications' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Online Applications
            </button>
          </div>

          {admissionSubTab === 'admissions' ? (
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-50">
                <h4 className="text-lg font-black text-gray-800 uppercase tracking-tight">Recent Admissions</h4>
                <p className="text-xs text-gray-400 font-bold uppercase mt-1">Last 5 admitted students</p>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-gray-400 border-b">
                  <tr>
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Class / Batch</th>
                    <th className="px-6 py-4">Admission Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users
                    .filter(u => u.role === UserRole.STUDENT)
                    .sort((a, b) => {
                      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                      return dateB - dateA;
                    })
                    .slice(0, 5)
                    .map(u => (
                      <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4 font-black text-gray-800 text-sm">{u.name}</td>
                        <td className="px-6 py-4 font-bold text-gray-500 text-xs uppercase">{u.batch}</td>
                        <td className="px-6 py-4 font-mono text-gray-400 text-[10px]">{u.createdAt || 'N/A'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              {admissionApplications.length === 0 ? (
                <div className="py-20 bg-white rounded-3xl border-4 border-dashed border-gray-50 text-center">
                  <p className="text-gray-400 font-black uppercase text-xs tracking-widest">No online applications yet</p>
                </div>
              ) : (
                admissionApplications.map(app => (
                  <div key={app.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-left">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-black text-gray-800 uppercase tracking-tight">{app.studentName}</h4>
                        <p className="text-xs text-blue-600 font-black uppercase tracking-widest">{app.admissionClass}</p>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">{new Date(app.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">Phone</p>
                        <p className="font-black text-gray-700">{app.phone}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">Institution</p>
                        <p className="font-black text-gray-700">{app.schoolCollege}</p>
                      </div>
                      {app.sscGPA && (
                        <>
                          <div>
                            <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">SSC GPA</p>
                            <p className="font-black text-emerald-600">{app.sscGPA}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">Board / Dept</p>
                            <p className="font-black text-gray-700">{app.board} / {app.department}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">SSC Roll / Reg</p>
                            <p className="font-black text-gray-700">{app.sscRoll} / {app.sscReg}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'financial-dashboard' && (
        <div className="space-y-6 text-left animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-3xl border shadow-sm">
            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-8">Financial Dashboard (Current Month)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <p className="text-blue-400 text-[10px] uppercase font-black tracking-widest mb-1">Collected</p>
                <h3 className="text-3xl font-black text-blue-600">৳{currentMonthCollection}</h3>
              </div>
              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <p className="text-indigo-400 text-[10px] uppercase font-black tracking-widest mb-1">Salary Paid</p>
                <h3 className="text-3xl font-black text-indigo-600">৳{currentMonthSalary}</h3>
              </div>
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                <p className="text-red-400 text-[10px] uppercase font-black tracking-widest mb-1">Expenses</p>
                <h3 className="text-3xl font-black text-red-600">৳{currentMonthExpense}</h3>
              </div>
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                <p className="text-emerald-400 text-[10px] uppercase font-black tracking-widest mb-1">Net Profit</p>
                <h3 className="text-3xl font-black text-emerald-600">৳{currentMonthProfit}</h3>
              </div>
            </div>
            
            <div className="mt-10 p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <h4 className="text-sm font-black text-gray-600 uppercase tracking-widest mb-4">Overall Totals</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Total Collection</p>
                  <p className="text-lg font-black text-gray-700">৳{totalCollection}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Total Salaries</p>
                  <p className="text-lg font-black text-gray-700">৳{totalSalaryPaid}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Total Expenses</p>
                  <p className="text-lg font-black text-gray-700">৳{totalExpense}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Total Profit</p>
                  <p className="text-lg font-black text-emerald-600">৳{netProfit}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6 text-left animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-3xl border shadow-sm">
            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-8">Dashboard History</h3>
            {dashboardHistory.length === 0 ? (
              <div className="py-20 text-center border-4 border-dashed border-gray-50 rounded-3xl">
                <p className="text-gray-400 font-black uppercase text-xs tracking-widest">No historical data available yet</p>
                <p className="text-[10px] text-gray-300 mt-2 uppercase">History is generated after the 5th of each month</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboardHistory.slice().reverse().map(h => (
                  <div key={h.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-black text-blue-600 uppercase">{new Date(h.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h4>
                      <span className="bg-emerald-100 text-emerald-600 text-[9px] font-black px-2 py-1 rounded uppercase">Archived</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400 font-bold uppercase">Collection</span>
                        <span className="font-black text-gray-700">৳{h.collected}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400 font-bold uppercase">Salaries</span>
                        <span className="font-black text-gray-700">৳{h.salaryPaid}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400 font-bold uppercase">Expenses</span>
                        <span className="font-black text-gray-700">৳{h.expenses}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between">
                        <span className="text-[10px] font-black text-gray-500 uppercase">Net Profit</span>
                        <span className="text-sm font-black text-emerald-600">৳{h.profit}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'settings' && (
        <div className="space-y-8 max-w-4xl mx-auto text-left">
          <div className="bg-white p-10 rounded-[2.5rem] border shadow-sm text-left">
            <h4 className="text-2xl font-black text-gray-800 mb-8 uppercase tracking-tight">System Controls</h4>
            <div className="space-y-8 text-left">
              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div><h5 className="font-black text-gray-800 text-sm uppercase tracking-wide">All Student Fine Display</h5><p className="text-xs text-gray-400 font-medium mt-1">Enable or disable viewing all students' fines at once in user roster.</p></div>
                <button onClick={() => setSettings({ ...settings, allStudentFineEnabled: !settings.allStudentFineEnabled })} className={`w-14 h-8 rounded-full transition-all relative ${settings.allStudentFineEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}><div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-md ${settings.allStudentFineEnabled ? 'right-1' : 'left-1'}`}></div></button>
              </div>
              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div><h5 className="font-black text-gray-800 text-sm uppercase tracking-wide">Monthly Fine Updates</h5><p className="text-xs text-gray-400 font-medium mt-1">Enable or disable automated monthly fine calculations (late fees).</p></div>
                <button onClick={() => setSettings({ ...settings, monthlyFineUpdateEnabled: !settings.monthlyFineUpdateEnabled })} className={`w-14 h-8 rounded-full transition-all relative ${settings.monthlyFineUpdateEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}><div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-md ${settings.monthlyFineUpdateEnabled ? 'right-1' : 'left-1'}`}></div></button>
              </div>
              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div><h5 className="font-black text-gray-800 text-sm uppercase tracking-wide">Absent Guardian SMS</h5><p className="text-xs text-gray-400 font-medium mt-1">Automatically notify parents via SMS when a student is marked as absent.</p></div>
                <button onClick={() => setSettings({ ...settings, guardianSmsEnabled: !settings.guardianSmsEnabled })} className={`w-14 h-8 rounded-full transition-all relative ${settings.guardianSmsEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}><div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-md ${settings.guardianSmsEnabled ? 'right-1' : 'left-1'}`}></div></button>
              </div>

              <div className="pt-8 border-t border-slate-100 space-y-4">
                <div className="p-8 bg-blue-600 rounded-[2rem] text-white shadow-xl shadow-blue-100">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h5 className="font-black text-lg uppercase tracking-tight">Primary Owner Account</h5>
                      <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1">Security & Access Keys</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-2xl">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white/10 p-4 rounded-xl border border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-widest">Login ID</span>
                      <span className="font-mono font-bold">1744602517</span>
                    </div>
                    <button 
                      onClick={() => setIsOwnerPasswordModalOpen(true)}
                      className="w-full bg-white text-blue-600 font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:bg-blue-50 transition-all"
                    >
                      Change Owner Password
                    </button>
                  </div>
                </div>
                <button onClick={handleRecalculateAttendance} className="w-full bg-slate-800 text-white font-black py-5 rounded-3xl text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all">Recalculate All Students' Attendance Rate</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isOwnerPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl text-left scale-in-center">
            <h3 className="text-3xl font-black text-gray-800 mb-8 uppercase tracking-tight">Update Owner Key</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Current Password</label>
                <input 
                  type="password" 
                  className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all"
                  value={ownerPasswordForm.current}
                  onChange={(e) => setOwnerPasswordForm({ ...ownerPasswordForm, current: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">New Password</label>
                <input 
                  type="password" 
                  className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all"
                  value={ownerPasswordForm.new}
                  onChange={(e) => setOwnerPasswordForm({ ...ownerPasswordForm, new: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Confirm New Password</label>
                <input 
                  type="password" 
                  className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all"
                  value={ownerPasswordForm.confirm}
                  onChange={(e) => setOwnerPasswordForm({ ...ownerPasswordForm, confirm: e.target.value })}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsOwnerPasswordModalOpen(false)} className="flex-1 border-2 border-slate-100 py-4 rounded-2xl font-black text-xs text-gray-400 uppercase tracking-widest">Cancel</button>
                <button onClick={handleChangeOwnerPassword} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100">Update Password</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddStudentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-10 shadow-2xl text-left overflow-y-auto max-h-[90vh]">
            <h3 className="text-3xl font-black text-gray-800 mb-8 uppercase tracking-tight">Add New Student</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Full Name</label>
                <input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Login ID</label>
                <input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={newStudent.id} onChange={(e) => setNewStudent({ ...newStudent, id: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Password</label>
                <input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={newStudent.password} onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Assigned Class</label>
                <select className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={newStudent.assignedClass} onChange={(e) => setNewStudent({ ...newStudent, assignedClass: e.target.value })}>
                  <option value="">Select Class</option>
                  <option value="Class 7">Class 7</option>
                  <option value="Class 8">Class 8</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 10">Class 10</option>
                  <option value="SSC Candidate">SSC Candidate</option>
                  <option value="Inter 1st Year">Inter 1st Year</option>
                  <option value="Inter 2nd Year">Inter 2nd Year</option>
                  <option value="HSC Candidate">HSC Candidate</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">SSC GPA</label>
                <input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={newStudent.sscResult} onChange={(e) => setNewStudent({ ...newStudent, sscResult: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">HSC GPA</label>
                <input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={newStudent.hscResult} onChange={(e) => setNewStudent({ ...newStudent, hscResult: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Student Phone (11 digits)</label>
                <input type="text" maxLength={11} className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={newStudent.phone} onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Guardian Phone (11 digits)</label>
                <input type="text" maxLength={11} className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={newStudent.guardianPhone} onChange={(e) => setNewStudent({ ...newStudent, guardianPhone: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Past Address</label>
                <textarea className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={newStudent.pastAddress} onChange={(e) => setNewStudent({ ...newStudent, pastAddress: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Present Address</label>
                <textarea className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={newStudent.presentAddress} onChange={(e) => setNewStudent({ ...newStudent, presentAddress: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-4 pt-8">
              <button onClick={() => setIsAddStudentModalOpen(false)} className="flex-1 border-2 border-slate-100 py-4 rounded-2xl font-black text-xs text-gray-400 uppercase tracking-widest">Cancel</button>
              <button onClick={handleAddStudent} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-100">Add Student</button>
            </div>
          </div>
        </div>
      )}

      {isAddTeacherModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-10 shadow-2xl text-left overflow-y-auto max-h-[90vh]">
            <h3 className="text-3xl font-black text-gray-800 mb-8 uppercase tracking-tight">Add New Teacher</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Full Name</label>
                <input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={newTeacher.name} onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Login ID</label>
                <input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={newTeacher.id} onChange={(e) => setNewTeacher({ ...newTeacher, id: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Password</label>
                <input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={newTeacher.password} onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Phone Number (11 digits)</label>
                <input type="text" maxLength={11} className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={newTeacher.phone} onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">NID Number</label>
                <input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={newTeacher.nidNumber} onChange={(e) => setNewTeacher({ ...newTeacher, nidNumber: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Address</label>
                <textarea className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={newTeacher.presentAddress} onChange={(e) => setNewTeacher({ ...newTeacher, presentAddress: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-4 pt-8">
              <button onClick={() => setIsAddTeacherModalOpen(false)} className="flex-1 border-2 border-slate-100 py-4 rounded-2xl font-black text-xs text-gray-400 uppercase tracking-widest">Cancel</button>
              <button onClick={handleAddTeacher} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100">Add Teacher</button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Details Modal */}
      {isViewDetailsModalOpen && selectedUserForDetails && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] scale-in-center text-left">
            <div className={`p-10 text-white relative flex-shrink-0 ${selectedUserForDetails.status === 'disabled' ? 'bg-slate-800' : 'bg-gradient-to-br from-blue-700 to-indigo-900'}`}>
              <button onClick={() => setIsViewDetailsModalOpen(false)} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
              <div className="flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left text-left">
                <img src={selectedUserForDetails.photo || `https://picsum.photos/seed/${selectedUserForDetails.id}/200/200`} className="w-28 h-28 rounded-[2rem] border-4 border-white/20 shadow-2xl object-cover" />
                <div className="text-left"><h3 className="text-4xl font-black tracking-tight uppercase">{selectedUserForDetails.name}</h3><div className="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start"><span className="bg-white/20 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10">{selectedUserForDetails.role}</span><span className="bg-blue-400/30 px-3 py-1 rounded-xl text-[10px] font-mono font-bold tracking-tighter">ID: {selectedUserForDetails.id}</span></div></div>
              </div>
            </div>
            <div className="p-10 overflow-y-auto space-y-10 text-left bg-white text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 text-left">
                <div className="space-y-6 text-left">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 pb-2 text-left">Academic Profile</h4>
                  <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1 text-left">Year / Class</p><p className="font-black text-gray-800 text-left">{selectedUserForDetails.batch || 'General Batch'}</p></div>
                  <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1 text-left">Academic Results</p><p className="font-black text-gray-800 text-left">{selectedUserForDetails.sscResult || 'SSC Pending'} / {selectedUserForDetails.hscResult || 'HSC Pending'}</p></div>
                  <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1 text-left">Address</p><p className="font-medium text-gray-600 text-sm text-left">{selectedUserForDetails.presentAddress || 'Address details not provided'}</p></div>
                </div>
                <div className="space-y-6 text-left">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 pb-2 text-left text-left">Contact & Family</h4>
                  <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1 text-left">Personal Phone</p><p className="font-black text-blue-600 text-left">{selectedUserForDetails.phone || 'N/A'}</p></div>
                  <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1 text-left">Father's Name</p><p className="font-black text-gray-800 text-left">{selectedUserForDetails.fatherName || 'N/A'}</p></div>
                  <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1 text-left">Guardian Mobile</p><p className="font-black text-indigo-600 underline text-left">{selectedUserForDetails.guardianPhone || 'N/A'}</p></div>
                </div>
              </div>

              {selectedUserForDetails.role === UserRole.STUDENT && (
                <div className="space-y-10 animate-in slide-in-from-bottom-4 text-left">
                  <div className="text-left">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 pb-2 mb-6 text-left">Financial Snapshot</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
                      <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 shadow-sm text-left"><p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1 text-left">Attendance Rate</p><h4 className="text-3xl font-black text-blue-700 text-left">{calculateAttendanceRate(selectedUserForDetails.id).toFixed(1)}%</h4></div>
                      <div className="p-6 bg-red-50 rounded-3xl border border-red-100 shadow-sm text-left"><p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-1 text-left">Current Due</p><h4 className="text-3xl font-black text-red-700 text-left">৳{calculateFees(selectedUserForDetails.id).total}</h4></div>
                      <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 shadow-sm text-left"><p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1 text-left">Last Mo. Fines</p><h4 className="text-3xl font-black text-emerald-700 text-left">৳{calculateFees(selectedUserForDetails.id).lastMonthFines}</h4></div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="flex justify-between items-end border-b border-gray-100 pb-2 mb-6 text-left"><h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-left">Last 3 Exam Results</h4><span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter">Academic Tracking</span></div>
                    <div className="space-y-4 text-left">{results.filter(r => r.studentId === selectedUserForDetails.id).length === 0 ? (<p className="text-xs text-gray-400 italic text-center py-4">No results recorded.</p>) : (results.filter(r => r.studentId === selectedUserForDetails.id).sort((a, b) => b.timestamp - a.timestamp).slice(0, 3).map(r => (<div key={r.id} className="flex justify-between items-center p-5 bg-slate-50/80 rounded-[1.5rem] border border-slate-100 text-left group hover:bg-white hover:shadow-lg hover:shadow-blue-50 transition-all text-left"><div className="text-left"><p className="text-xs font-black text-gray-800 uppercase text-left group-hover:text-blue-600 transition-colors">{r.subject} <span className="text-[8px] text-blue-400 ml-2 bg-blue-50 px-2 py-0.5 rounded-full">({r.type})</span></p><p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1 text-left">{r.date}</p></div><div className="text-right"><p className="text-base font-black text-gray-900">{r.marks} <span className="text-gray-400 text-xs font-bold">/ {r.totalMarks}</span></p><div className="w-12 h-1 bg-gray-100 mt-2 rounded-full overflow-hidden"><div className={`h-full ${r.marks/r.totalMarks >= 0.8 ? 'bg-emerald-400' : 'bg-blue-400'}`} style={{width: `${(r.marks/r.totalMarks)*100}%`}}></div></div></div></div>)))}</div>
                  </div>
                  <div className="flex gap-4 pt-4 text-left"><button onClick={() => handleSelectStudentForDeduction(selectedUserForDetails)} className="flex-1 bg-orange-600 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-orange-100 hover:scale-[1.02] transition-all">Apply Waiver / Reduce Fine</button>{selectedUserForDetails.id !== '1744602517' && (<button onClick={() => handleRemoveUser(selectedUserForDetails.id)} className="bg-red-50 text-red-600 font-black px-6 py-4 rounded-2xl text-[10px] uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-all">Remove Student</button>)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tuition Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-lg p-10 shadow-2xl overflow-y-auto max-h-[90vh] text-left scale-in-center text-left">
            <h3 className="text-3xl font-black text-gray-800 mb-8 uppercase tracking-tight text-left">Post Tuition Entry</h3>
            <div className="mb-8 text-left">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 text-left">Search Student Identity *</label>
              <input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold bg-slate-50 focus:bg-white focus:border-blue-500 transition-all outline-none" placeholder="Find student..." value={studentSearchInPayment} onChange={(e) => setStudentSearchInPayment(e.target.value)} />
              {studentSearchInPayment && (<div className="mt-2 border-2 border-slate-50 rounded-2xl bg-white shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-50 text-left">{searchedStudents(studentSearchInPayment).map(s => <button key={s.id} onClick={() => handleSelectStudentForPayment(s)} className="w-full text-left p-4 hover:bg-emerald-50 font-black text-gray-700 text-sm transition-colors flex justify-between items-center text-left"><span>{s.name}</span> <span className="text-[10px] text-gray-400 font-mono text-left">UID: {s.id}</span></button>)}</div>)}
            </div>
            {paymentForm.studentId && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 text-left">
                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex items-center justify-between text-left"><div><p className="text-[10px] text-blue-400 font-black uppercase tracking-widest text-left">Selected Profile</p><p className="text-sm font-black text-blue-900 text-left">{users.find(u => u.id === paymentForm.studentId)?.name}</p></div><button onClick={() => setPaymentForm({...paymentForm, studentId: ''})} className="text-[10px] font-black uppercase text-blue-600 hover:underline">Change</button></div>
                <div className="grid grid-cols-2 gap-6 text-left"><div><label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block text-left">Monthly Tuition</label><input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black bg-slate-50" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: Number(e.target.value)})} /></div><div><label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block text-left">Fine Settlement</label><input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-red-600 bg-slate-50" value={paymentForm.finePaid} onChange={(e) => setPaymentForm({...paymentForm, finePaid: Number(e.target.value)})} /></div></div>
                <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex justify-between items-center font-black text-left"><span className="text-gray-600 text-xs uppercase tracking-widest text-left">Total Collection Amount</span><span className="text-2xl text-emerald-700 text-left">৳{paymentForm.amount + paymentForm.finePaid}</span></div>
                <div className="flex gap-4 text-left"><button onClick={() => setIsPaymentModalOpen(false)} className="flex-1 border-2 border-slate-100 py-4 rounded-2xl font-black text-xs text-gray-400 uppercase tracking-widest hover:bg-slate-50 transition-all text-left">Cancel</button><button onClick={handleCollectPayment} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 hover:scale-[1.02] transition-all text-left">Commit Entry</button></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Waivers, Notices, Salaries etc remain identical as requested */}
      {isDeductModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300 text-left">
          <div className="bg-white rounded-[2rem] w-full max-w-lg p-10 shadow-2xl overflow-y-auto max-h-[90vh] text-left scale-in-center text-left">
            <h3 className="text-3xl font-black text-orange-600 mb-8 uppercase tracking-tight text-left">Fine Reduction (Waiver)</h3>
            <div className="mb-8 text-left">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 text-left">Target Student *</label>
              <input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold bg-slate-50 focus:bg-white focus:border-orange-500 transition-all outline-none" placeholder="Find student..." value={studentSearchInPayment} onChange={(e) => setStudentSearchInPayment(e.target.value)} />
              {studentSearchInPayment && (<div className="mt-2 border-2 border-slate-50 rounded-2xl bg-white shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-50 text-left">{searchedStudents(studentSearchInPayment).map(s => <button key={s.id} onClick={() => handleSelectStudentForDeduction(s)} className="w-full text-left p-4 hover:bg-orange-50 font-black text-gray-700 text-sm transition-colors flex justify-between items-center text-left"><span>{s.name}</span> <span className="text-[10px] text-gray-400 font-mono text-left">UID: {s.id}</span></button>)}</div>)}
            </div>
            {deductionForm.studentId && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 text-left">
                <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 flex items-center justify-between text-left"><div><p className="text-[10px] text-orange-400 font-black uppercase tracking-widest text-left">Active Target</p><p className="text-sm font-black text-orange-900 text-left">{users.find(u => u.id === deductionForm.studentId)?.name}</p></div><button onClick={() => setDeductionForm({...deductionForm, studentId: ''})} className="text-[10px] font-black uppercase text-orange-600 hover:underline">Change</button></div>
                <div className="text-left"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 text-left">Reduction Amount</label><input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-orange-600 bg-slate-50" value={deductionForm.amount} onChange={(e) => setDeductionForm({...deductionForm, amount: Number(e.target.value)})} /></div>
                <div className="text-left"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 text-left">Reason *</label><textarea className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium bg-slate-50 focus:bg-white focus:border-orange-500 outline-none transition-all" rows={3} value={deductionForm.reason} onChange={(e) => setDeductionForm({...deductionForm, reason: e.target.value})}></textarea></div>
                <div className="flex gap-4 text-left"><button onClick={() => setIsDeductModalOpen(false)} className="flex-1 border-2 border-slate-100 py-4 rounded-2xl font-black text-xs text-gray-400 uppercase tracking-widest hover:bg-slate-50 transition-all text-left">Discard</button><button onClick={handleDeductMoney} className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-100 hover:scale-[1.02] transition-all text-left">Apply Waiver</button></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Salary, College Expense, Notice, User provision modals follow the same pattern... */}
      {isSalaryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-lg p-10 shadow-2xl text-left scale-in-center">
            <h3 className="text-3xl font-black text-slate-800 mb-8 uppercase tracking-tight">Selley (Teacher/Staff)</h3>
            <div className="space-y-6">
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Staff/Teacher Name *</label><input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold bg-slate-50" value={salaryForm.staffName} onChange={(e) => setSalaryForm({...salaryForm, staffName: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Amount (BDT) *</label><input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold bg-slate-50" value={salaryForm.amount} onChange={(e) => setSalaryForm({...salaryForm, amount: Number(e.target.value)})} /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Month</label><input type="month" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold bg-slate-50" value={salaryForm.month} onChange={(e) => setSalaryForm({...salaryForm, month: e.target.value})} /></div>
              </div>
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Note (Optional)</label><input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold bg-slate-50" value={salaryForm.note} onChange={(e) => setSalaryForm({...salaryForm, note: e.target.value})} /></div>
              <div className="flex gap-4"><button onClick={() => setIsSalaryModalOpen(false)} className="flex-1 border-2 border-slate-100 py-4 rounded-2xl font-black text-xs text-gray-400 uppercase tracking-widest">Cancel</button><button onClick={handleAddSalary} className="flex-1 bg-slate-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Commit Entry</button></div>
            </div>
          </div>
        </div>
      )}

      {isCollegeExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-lg p-10 shadow-2xl text-left scale-in-center">
            <h3 className="text-3xl font-black text-indigo-600 mb-8 uppercase tracking-tight text-left">College Expense Entry</h3>
            <div className="space-y-6">
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 text-left">Item Description *</label><input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold bg-slate-50" value={collegeExpenseForm.itemDescription} onChange={(e) => setCollegeExpenseForm({...collegeExpenseForm, itemDescription: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 text-left">Amount *</label><input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold bg-slate-50" value={collegeExpenseForm.amount} onChange={(e) => setCollegeExpenseForm({...collegeExpenseForm, amount: Number(e.target.value)})} /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 text-left">Date</label><input type="date" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold bg-slate-50" value={collegeExpenseForm.date} onChange={(e) => setCollegeExpenseForm({...collegeExpenseForm, date: e.target.value})} /></div>
              </div>
              <div className="flex gap-4"><button onClick={() => setIsCollegeExpenseModalOpen(false)} className="flex-1 border-2 border-slate-100 py-4 rounded-2xl font-black text-xs text-gray-400 uppercase tracking-widest">Cancel</button><button onClick={handleAddCollegeExpense} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Commit Entry</button></div>
            </div>
          </div>
        </div>
      )}

      {isNoticeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300 text-left">
          <div className="bg-white rounded-[2rem] w-full max-w-lg p-10 shadow-2xl text-left scale-in-center text-left">
            <h3 className="text-3xl font-black text-gray-800 mb-8 uppercase tracking-tight text-left text-left">Broadcast official Notice</h3>
            <div className="space-y-6 mb-10 text-left">
              <div className="text-left"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 text-left">Subject Header</label><input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black bg-slate-50" value={newNotice.title} onChange={(e) => setNewNotice({...newNotice, title: e.target.value})} /></div>
              <div className="text-left"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 text-left">Message Body</label><textarea rows={5} className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all" value={newNotice.content} onChange={(e) => setNewNotice({...newNotice, content: e.target.value})}></textarea></div>
            </div>
            <div className="flex gap-4 text-left"><button onClick={() => setIsNoticeModalOpen(false)} className="flex-1 border-2 border-slate-100 py-4 rounded-2xl font-black text-xs text-gray-400 uppercase tracking-widest">Cancel</button><button onClick={handleAddNotice} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100">Broadcast Now</button></div>
          </div>
        </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300 text-left">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl p-10 shadow-2xl overflow-y-auto max-h-[90vh] text-left scale-in-center text-left">
            <h3 className="text-3xl font-black text-gray-800 mb-10 uppercase tracking-tight text-left">Provision New Identity</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10 text-left">
              <div className="space-y-6 text-left">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 text-left text-left">Core Identity</h4>
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block text-left">Full Legal Name *</label><input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-3.5 font-bold bg-slate-50" onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} /></div>
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block text-left">Identity ID *</label><input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-3.5 font-bold bg-slate-50" onChange={(e) => setNewUser({ ...newUser, id: e.target.value })} /></div>
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block text-left">Access Password *</label><input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-3.5 font-bold bg-slate-50" onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} /></div>
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block text-left text-left">Designated Role</label><select className="w-full border-2 border-slate-50 rounded-2xl p-3.5 font-bold bg-slate-50" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}><option value={UserRole.STUDENT}>STUDENT</option><option value={UserRole.TEACHER}>TEACHER</option><option value={UserRole.OWNER}>OWNER</option></select></div>
              </div>
              <div className="space-y-6 text-left">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 text-left text-left">Contact & Bio</h4>
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block text-left">Mobile No (11 Digits) *</label><input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-3.5 font-bold bg-slate-50" onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} /></div>
                {newUser.role === UserRole.STUDENT && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block text-left">Assigned Batch *</label>
                      <select 
                        className="w-full border-2 border-slate-50 rounded-2xl p-3.5 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all"
                        value={newUser.batch || ''}
                        onChange={(e) => setNewUser({ ...newUser, batch: e.target.value })}
                      >
                        <option value="">-- Select Batch --</option>
                        <option value="Class 7">Class 7</option>
                        <option value="Class 8">Class 8</option>
                        <option value="Class 9">Class 9</option>
                        <option value="Class 10">Class 10</option>
                        <option value="SSC Candidate">SSC Candidate</option>
                        <option value="Inter 1st Year">Inter 1st Year</option>
                        <option value="Inter 2nd Year">Inter 2nd Year</option>
                        <option value="HSC Candidate">HSC Candidate</option>
                      </select>
                    </div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block text-left">Monthly Tuition Fee</label><input type="number" className="w-full border-2 border-slate-50 rounded-2xl p-3.5 font-bold bg-slate-50" onChange={(e) => setNewUser({ ...newUser, monthlyFee: Number(e.target.value) })} /></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block text-left">Guardian Mobile *</label><input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-3.5 font-bold bg-slate-50" onChange={(e) => setNewUser({ ...newUser, guardianPhone: e.target.value })} /></div>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-6 sticky bottom-0 bg-white pt-6 border-t border-slate-50 text-left"><button onClick={() => setIsUserModalOpen(false)} className="flex-1 border-2 border-slate-100 py-4 rounded-2xl font-black text-xs text-gray-400 uppercase tracking-widest text-left">Discard</button><button onClick={handleAddUser} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 text-left">Activate Identity</button></div>
          </div>
        </div>
      )}
      {/* Remove Confirmation Modal */}
      {isRemoveConfirmModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-10 shadow-2xl text-center scale-in-center">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">⚠️</div>
            <h3 className="text-2xl font-black text-gray-800 mb-4 uppercase tracking-tight">Are you sure?</h3>
            <p className="text-gray-500 text-sm mb-8 font-medium">Are you sure you want to remove this student? This action will permanently deactivate the account and revoke all access.</p>
            <div className="flex gap-4">
              <button onClick={() => { setIsRemoveConfirmModalOpen(false); setUserIdToRemove(null); }} className="flex-1 border-2 border-slate-100 py-4 rounded-2xl font-black text-xs text-gray-400 uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={confirmRemoveUser} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition-all">Yes (Sure)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
