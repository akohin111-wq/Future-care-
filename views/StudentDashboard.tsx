
import React, { useState, useEffect, useRef } from 'react';
import { User, Attendance, Payment, Notice, Notification, SystemSettings, Result, UserRole } from '../types';
import { PERSONAL_PAYMENT_CHARGE_PER_1000 } from '../constants';

interface StudentDashboardProps {
  user: User;
  users: User[];
  attendances: Attendance[];
  payments: Payment[];
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  results: Result[];
  notices: Notice[];
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  calculateFees: (studentId: string) => any;
  settings: SystemSettings;
  calculateAttendanceRate: (studentId: string) => number;
  onUpdateUser: (updatedUser: User) => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, users, attendances, payments, setPayments, results, notices, notifications, setNotifications, calculateFees, settings, calculateAttendanceRate, onUpdateUser }) => {
  const fees = calculateFees(user.id);
  const myAttendances = attendances.filter(a => a.studentId === user.id);
  const attendanceRate = calculateAttendanceRate(user.id);
  const [activeTab, setActiveTab] = useState<'main' | 'results' | 'leaderboard'>('main');
  const [resultType, setResultType] = useState<'Class Test' | 'Class Exam'>('Class Test');
  
  // Online Payment State
  const [isOnlinePaymentModalOpen, setIsOnlinePaymentModalOpen] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [onlinePayType, setOnlinePayType] = useState<'PERSONAL' | 'AGENT'>('PERSONAL');
  const [extraCharge, setExtraCharge] = useState(0);
  const [trxId, setTrxId] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const myNotifications = notifications.filter(n => n.userId === user.id);
  const myResults = results.filter(r => r.studentId === user.id && r.type === resultType);

  // Leaderboard Logic
  const getLeaderboard = () => {
    const studentLatestExamMarks = users
      .filter(u => u.role === UserRole.STUDENT && u.status === 'active' && u.batch === user.batch)
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

  useEffect(() => {
    if (onlinePayType === 'PERSONAL') {
      const charge = Math.ceil((fees.total / 1000) * PERSONAL_PAYMENT_CHARGE_PER_1000);
      setExtraCharge(charge);
    } else {
      setExtraCharge(0);
    }
  }, [onlinePayType, fees.total]);

  const markNotifRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Validation Error: File size exceeds 2MB limit."); return; }
    if (!['image/jpeg', 'image/png'].includes(file.type)) { alert("Validation Error: Only JPG or PNG formats are allowed."); return; }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      onUpdateUser({ ...user, photo: base64String });
      alert("Success: Profile photo updated successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitOnlinePayment = () => {
    if (!selectedMethodId || !trxId || !senderNumber || senderNumber.length < 4) {
      alert("Validation Error: All fields are required. Sender last number must be at least 4 digits.");
      return;
    }

    setIsSubmitting(true);
    const selectedMethod = settings.paymentMethods.find(m => m.id === selectedMethodId);

    const newPayment: Payment = {
      id: 'OP' + Date.now(),
      studentId: user.id,
      amount: fees.monthly,
      finePaid: fees.absent + fees.late,
      extraCharge: extraCharge,
      month: new Date().toISOString().slice(0, 7),
      timestamp: Date.now(),
      type: 'BOTH',
      method: selectedMethod?.name || 'Online',
      paymentType: onlinePayType,
      status: 'PENDING',
      trxId: trxId,
      senderLastNumber: senderNumber,
      note: `Online Payment via ${selectedMethod?.name}`
    };

    setPayments(prev => [...prev, newPayment]);
    
    // Reset and close
    setTrxId('');
    setSenderNumber('');
    setIsOnlinePaymentModalOpen(false);
    setIsSubmitting(false);
    alert("Payment submitted for verification. Your due balance will update once administration approves the transaction.");
  };

  return (
    <div className="space-y-6 text-left">
      {/* Mobile-friendly Tab Bar */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit mb-4">
        <button 
          onClick={() => setActiveTab('main')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === 'main' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-slate-50'}`}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('results')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === 'results' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-slate-50'}`}
        >
          Result
        </button>
        <button 
          onClick={() => setActiveTab('leaderboard')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === 'leaderboard' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-slate-50'}`}
        >
          Leaderboard
        </button>
      </div>

      {activeTab === 'main' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
            <div className="bg-white border border-blue-100 p-6 rounded-2xl shadow-sm h-full flex flex-col">
              <h4 className="font-black text-gray-800 mb-4 flex justify-between items-center uppercase tracking-tighter text-left">Announcements <span className="text-[10px] font-black text-blue-400 uppercase">Bulletin</span></h4>
              <div className="space-y-4 flex-grow overflow-y-auto max-h-[250px] scrollbar-hide text-left">
                {notices.length === 0 ? <p className="text-gray-400 italic text-center py-10 text-xs">No updates.</p> : 
                  notices.map(n => (
                    <div key={n.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left">
                      <h5 className="font-black text-blue-700 text-sm">{n.title}</h5>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{n.content}</p>
                      <p className="text-[9px] text-gray-400 font-bold mt-2 uppercase tracking-widest">{new Date(n.timestamp).toLocaleDateString()}</p>
                    </div>
                  ))
                }
              </div>
            </div>
            <div className="bg-white border border-emerald-100 p-6 rounded-2xl shadow-sm h-full flex flex-col">
              <h4 className="font-black text-gray-800 mb-4 flex justify-between items-center uppercase tracking-tighter text-left">Activity Log <span className="text-[10px] font-black text-emerald-400 uppercase">Inbox</span></h4>
              <div className="space-y-4 flex-grow overflow-y-auto max-h-[250px] scrollbar-hide text-left">
                {myNotifications.length === 0 ? <p className="text-gray-400 italic text-center py-10 text-xs">Inbox clear.</p> : 
                  myNotifications.map(n => (
                    <div key={n.id} onClick={() => markNotifRead(n.id)} className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${n.read ? 'bg-slate-50 opacity-50' : 'bg-emerald-50 border-emerald-100 ring-2 ring-emerald-50'}`}>
                      <h5 className="font-black text-gray-800 text-xs uppercase tracking-tight">{n.title}</h5>
                      <p className="text-xs text-gray-600 mt-1 font-medium">{n.message}</p>
                      <p className="text-[9px] text-gray-400 font-bold mt-2 uppercase">{new Date(n.timestamp).toLocaleTimeString()}</p>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="md:col-span-1 text-left">
              <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col items-center">
                <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
                  <img src={user.photo || `https://picsum.photos/seed/${user.id}/150/150`} className="w-32 h-32 rounded-3xl border-4 border-blue-50 shadow-xl object-cover mb-4 transition-all group-hover:brightness-75" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white/90 p-2 rounded-full shadow-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleFileChange} />
                </div>
                <h3 className="text-xl font-black tracking-tight uppercase">{user.name}</h3>
                <p className="text-blue-600 font-black text-[10px] uppercase tracking-widest mt-1 text-center">Roll: {user.roll || 'N/A'}</p>
                <div className="mt-8 w-full pt-8 border-t space-y-4 text-left">
                  <div className="text-left"><p className="text-[10px] text-gray-400 font-black uppercase text-left">Batch</p><p className="text-sm font-black text-left">{user.batch || 'N/A'}</p></div>
                  <div className="text-left"><p className="text-[10px] text-gray-400 font-black uppercase text-left">Guardian</p><p className="text-sm font-black text-left">{user.fatherName || 'N/A'}</p></div>
                  <div className="text-left"><p className="text-[10px] text-gray-400 font-black uppercase text-left">Mobile</p><p className="text-sm font-black text-indigo-600 text-left">{user.phone || 'N/A'}</p></div>
                </div>
              </div>
            </div>
            <div className="md:col-span-2 space-y-6 text-left">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="bg-white p-6 rounded-3xl border shadow-sm text-left"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-left">Attendance Rate</p><h4 className="text-4xl font-black text-blue-600 text-left">{attendanceRate.toFixed(1)}%</h4></div>
                <div className="bg-white p-6 rounded-3xl border shadow-sm text-left"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-left">Outstanding Dues</p><h4 className="text-4xl font-black text-red-600 text-left">৳{fees.total}</h4></div>
              </div>
              <div className="bg-white p-10 rounded-[2.5rem] border shadow-sm text-center">
                <h4 className="font-black text-gray-800 mb-8 uppercase tracking-tighter text-xl">Dues Breakdown</h4>
                <div className="space-y-4 text-left border-b border-dashed pb-8 mb-8 text-sm">
                  <div className="flex justify-between font-bold text-gray-600"><span>Tuition (Remaining after adjustments)</span><span>৳{fees.monthly}</span></div>
                  <div className="flex justify-between font-bold text-orange-600"><span>Unpaid Fines (Reason: Absent)</span><span>৳{fees.absent + fees.late}</span></div>
                  <div className="flex justify-between text-3xl font-black text-blue-700 pt-4"><span>Total Payable</span><span>৳{fees.total}</span></div>
                </div>
                <button disabled={fees.total === 0} onClick={() => setIsOnlinePaymentModalOpen(true)} className={`w-full py-5 rounded-2xl font-black text-sm tracking-widest uppercase transition-all shadow-xl ${fees.total === 0 ? 'bg-gray-100 text-gray-400' : 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white'}`}>{fees.total === 0 ? 'ALL CLEAR' : 'PROCEED TO PAY ৳' + fees.total}</button>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm overflow-hidden text-left">
            <h4 className="font-black text-gray-800 mb-6 uppercase tracking-tight text-xl">Payment & Adjustment History</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-gray-400 uppercase font-black text-[10px] tracking-widest">
                  <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Type / Channel</th><th className="px-6 py-4 text-center">Amount</th><th className="px-6 py-4">Status / TrxID</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.filter(p => p.studentId === user.id).length === 0 ? <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">No records.</td></tr> : 
                    payments.filter(p => p.studentId === user.id).reverse().map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-gray-500 font-bold">{new Date(p.timestamp).toLocaleDateString()}</td>
                        <td className="px-6 py-4"><p className="font-black text-gray-800 uppercase text-xs">{p.type}</p><p className="text-[10px] text-gray-400 font-bold uppercase">{p.method}</p></td>
                        <td className={`px-6 py-4 font-black text-center text-base ${p.type === 'ADJUSTMENT' ? 'text-orange-600' : 'text-emerald-600'}`}>{p.type === 'ADJUSTMENT' ? '-' : '+'}৳{p.amount + p.finePaid}</td>
                        <td className="px-6 py-4">
                          {p.status ? (
                            <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${p.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : p.status === 'REJECTED' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600 animate-pulse'}`}>
                              {p.status}
                            </span>
                          ) : <span className="text-[10px] text-gray-400 uppercase font-bold">LEGACY</span>}
                          {p.trxId && <p className="text-[9px] font-mono text-gray-400 mt-1">TrxID: {p.trxId}</p>}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === 'results' ? (
        /* Result System View */
        <div className="space-y-6 animate-in fade-in duration-500 text-left">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Academic Performance</h3>
              <div className="flex gap-2 bg-slate-50 p-1 rounded-xl border">
                <button onClick={() => setResultType('Class Test')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${resultType === 'Class Test' ? 'bg-white text-blue-600 shadow-sm border border-blue-50' : 'text-gray-400 hover:text-gray-600'}`}>Class Test</button>
                <button onClick={() => setResultType('Class Exam')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${resultType === 'Class Exam' ? 'bg-white text-blue-600 shadow-sm border border-blue-50' : 'text-gray-400 hover:text-gray-600'}`}>Class Exam</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myResults.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                  <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">No results found for {resultType}</p>
                </div>
              ) : (
                myResults.map(r => (
                  <div key={r.id} className="p-6 rounded-3xl border border-slate-100 bg-white hover:shadow-xl hover:scale-[1.02] transition-all relative overflow-hidden group text-left">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 -mr-8 -mt-8 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-3 relative z-10 text-left">{new Date(r.date).toLocaleDateString()}</p>
                    <h4 className="text-lg font-black text-gray-800 mb-4 border-b pb-4 relative z-10 uppercase tracking-tight text-left">{r.subject}</h4>
                    <div className="flex items-end gap-2 relative z-10 text-left">
                      <span className="text-4xl font-black text-blue-700">{r.marks}</span>
                      <span className="text-gray-400 font-bold mb-1">/ {r.totalMarks}</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center relative z-10 text-left">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status: Recorded</span>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${r.marks / r.totalMarks >= 0.8 ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                        {((r.marks / r.totalMarks) * 100).toFixed(0)}% Score
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Leaderboard System View */
        <div className="space-y-6 text-left animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-[2.5rem] border shadow-sm text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
              <div>
                <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Academic Leaderboard ({user.batch})</h3>
                <p className="text-xs text-gray-400 font-bold uppercase mt-1">Top 5 students in your class based on latest Class Exam</p>
              </div>
              <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center text-2xl">🏆</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b">
                  <tr><th className="px-8 py-5">Rank</th><th className="px-8 py-5">Student Identity</th><th className="px-8 py-5 text-center">Latest Marks</th><th className="px-8 py-5 text-right">Performance</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {getLeaderboard().length === 0 ? (
                    <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-400 italic">No Class Exam results found to display on leaderboard.</td></tr>
                  ) : (
                    getLeaderboard().map((entry, index) => (
                      <tr key={entry.id} className={`hover:bg-blue-50/30 transition-colors ${index === 0 ? 'bg-yellow-50/10' : entry.id === user.id ? 'bg-blue-50/20 ring-2 ring-blue-500 ring-inset' : ''}`}>
                        <td className="px-8 py-6">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 ${
                            index === 0 ? 'bg-yellow-400 border-yellow-500 text-white' : 
                            index === 1 ? 'bg-slate-300 border-slate-400 text-white' : 
                            index === 2 ? 'bg-orange-300 border-orange-400 text-white' : 
                            'bg-slate-50 border-slate-100 text-gray-400'
                          }`}>{index + 1}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <img src={users.find(u => u.id === entry.id)?.photo || `https://picsum.photos/seed/${entry.id}/40/40`} className="w-10 h-10 rounded-xl border-2 border-white shadow-sm object-cover" />
                            <div>
                              <p className={`font-black text-sm uppercase ${entry.id === user.id ? 'text-blue-600' : 'text-gray-800'}`}>{entry.name} {entry.id === user.id && '(YOU)'}</p>
                              <p className="text-[10px] font-mono text-gray-400 tracking-tighter">ID: {entry.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="text-lg font-black text-blue-600">{entry.marks}</span>
                          <span className="text-gray-400 text-xs font-bold ml-1">/ {entry.total}</span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                            {((entry.marks / entry.total) * 100).toFixed(1)}% Score
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isOnlinePaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300 text-left">
            <div className="bg-blue-600 p-8 text-white text-center">
              <p className="text-[10px] font-black uppercase opacity-70 mb-2">Checkout (Verification Mode)</p>
              <h3 className="text-4xl font-black tracking-tighter">৳{fees.total + extraCharge}</h3>
            </div>
            <div className="p-8 space-y-6 text-left">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 text-left">1. Select Provider</label>
                <div className="grid grid-cols-2 gap-3">
                  {settings.paymentMethods.map(m => (
                    <button key={m.id} onClick={() => setSelectedMethodId(m.id)} className={`p-4 border-2 rounded-2xl transition-all text-center ${selectedMethodId === m.id ? 'border-blue-600 bg-blue-50 shadow-inner' : 'border-slate-50 bg-slate-50'}`}>
                      <p className="text-sm font-black">{m.name}</p>
                      <p className="text-[10px] font-mono text-gray-500 mt-1">{m.number}</p>
                    </button>
                  ))}
                </div>
              </div>

              {selectedMethodId && (
                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100">
                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-tighter">Send exact amount to selected number above. Enter details below.</p>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 text-left">2. Transaction ID (TrxID) *</label>
                    <input 
                      type="text" 
                      className="w-full border-2 border-slate-100 rounded-xl p-3 font-bold bg-slate-50 focus:bg-white focus:border-blue-500 transition-all outline-none" 
                      placeholder="Enter 10-12 character TrxID" 
                      value={trxId} 
                      onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 text-left">3. Sender Last Number (Last 4 Digits) *</label>
                    <input 
                      type="text" 
                      maxLength={4}
                      className="w-full border-2 border-slate-100 rounded-xl p-3 font-bold bg-slate-50 focus:bg-white focus:border-blue-500 transition-all outline-none" 
                      placeholder="e.g. 1234" 
                      value={senderNumber} 
                      onChange={(e) => setSenderNumber(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  <button 
                    disabled={isSubmitting}
                    onClick={handleSubmitOnlinePayment}
                    className="w-full bg-blue-600 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'SUBMITTING...' : 'SUBMIT PAYMENT FOR APPROVAL'}
                  </button>
                </div>
              )}
              
              <button onClick={() => setIsOnlinePaymentModalOpen(false)} className="w-full bg-slate-800 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest">Cancel Portal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
