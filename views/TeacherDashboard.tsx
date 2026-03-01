
import React, { useState } from 'react';
import { User, Attendance, UserRole, SystemSettings, Notice, Result } from '../types';

interface TeacherDashboardProps {
  user: User;
  users: User[];
  attendances: Attendance[];
  setAttendances: React.Dispatch<React.SetStateAction<Attendance[]>>;
  results: Result[];
  setResults: React.Dispatch<React.SetStateAction<Result[]>>;
  notices: Notice[];
  settings: SystemSettings;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, users, attendances, setAttendances, results, setResults, notices, settings }) => {
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeView, setActiveView] = useState<'marking' | 'tracking' | 'notices' | 'results' | 'leaderboard'>('marking');
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  
  // Result Update State
  const [selectedStudentForRes, setSelectedStudentForRes] = useState<User | null>(null);
  const [resultForm, setResultForm] = useState({
    type: 'Class Test' as 'Class Test' | 'Class Exam',
    subject: '',
    marks: 0,
    totalMarks: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const batches = Array.from(new Set(users.filter(u => u.batch && u.role === UserRole.STUDENT).map(u => u.batch)));
  const studentsInBatch = users.filter(u => u.batch === selectedBatch && u.role === UserRole.STUDENT);

  const isFriday = new Date(selectedDate).getDay() === 5;
  const isHoliday = settings.disabledAttendanceDates.includes(selectedDate);
  const markingDisabled = (isFriday && !settings.fridayMarkingEnabled) || isHoliday;

  const setAttendanceStatus = (studentId: string, status: 'PRESENT' | 'ABSENT') => {
    if (markingDisabled) {
      alert("Attendance marking is disabled for this day (Friday or Holiday).");
      return;
    }

    const existingIndex = attendances.findIndex(a => a.studentId === studentId && a.date === selectedDate);
    
    let updatedAttendances = [...attendances];
    
    if (existingIndex > -1) {
      updatedAttendances[existingIndex] = {
        ...updatedAttendances[existingIndex],
        status,
        markedBy: user.id
      };
    } else {
      const newAtt: Attendance = {
        id: Date.now().toString() + Math.random(),
        studentId,
        date: selectedDate,
        status,
        markedBy: user.id
      };
      updatedAttendances.push(newAtt);
    }
    
    setAttendances(updatedAttendances);

    // Automation Logic: SMS alert on Absence & Auto Fine is handled via dynamic calculation in App.tsx
    if (status === 'ABSENT' && settings.guardianSmsEnabled) {
      const student = users.find(u => u.id === studentId);
      if (student && student.guardianPhone) {
        console.log(`[SMS API] Sending to ${student.guardianPhone}: Future Care Alert: Apnar shontan ${student.name} ajke class-e absent chilo. 20 TK fine add kora holo.`);
      }
    }
  };

  const getMissedDates = (studentId: string) => {
    return attendances
      .filter(a => a.studentId === studentId && a.status === 'ABSENT')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleAddResult = () => {
    if (!selectedStudentForRes || !resultForm.subject || resultForm.totalMarks <= 0) {
      alert("Validation Error: Please select a student and enter valid subject and total marks.");
      return;
    }

    const newResult: Result = {
      id: Date.now().toString(),
      studentId: selectedStudentForRes.id,
      type: resultForm.type,
      subject: resultForm.subject,
      marks: Number(resultForm.marks),
      totalMarks: Number(resultForm.totalMarks),
      date: resultForm.date,
      timestamp: Date.now()
    };

    setResults([...results, newResult]);
    alert("Result saved successfully!");
    setResultForm({
      type: 'Class Test',
      subject: '',
      marks: 0,
      totalMarks: 0,
      date: new Date().toISOString().split('T')[0]
    });
    setSelectedStudentForRes(null);
  };

  // Leaderboard Logic
  const getLeaderboard = () => {
    const studentLatestExamMarks = users
      .filter(u => u.role === UserRole.STUDENT && u.status === 'active' && (!selectedBatch || u.batch === selectedBatch))
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      {/* Tab Selector */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit overflow-x-auto scrollbar-hide">
        <button 
          onClick={() => setActiveView('marking')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === 'marking' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Daily Marking
        </button>
        <button 
          onClick={() => setActiveView('tracking')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === 'tracking' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Missed Classes
        </button>
        <button 
          onClick={() => setActiveView('results')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === 'results' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Result Update
        </button>
        <button 
          onClick={() => setActiveView('leaderboard')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === 'leaderboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Leaderboard
        </button>
        <button 
          onClick={() => setActiveView('notices')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === 'notices' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Notices
        </button>
      </div>

      {activeView === 'marking' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Mode</p>
                <h4 className="text-lg font-black text-gray-800 uppercase tracking-tighter">Attendance Entry</h4>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 text-xl font-black">📝</div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Target Date</p>
                <h4 className="text-lg font-black text-gray-800 uppercase tracking-tighter">{selectedDate}</h4>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 text-xl font-black">📅</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-6 text-left">
              <div className="flex-1 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Assigned Batch</label>
                <select 
                  className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl p-4 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 font-bold text-gray-700 transition-all appearance-none"
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                >
                  <option value="">-- Choose Class --</option>
                  {batches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="flex-1 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Change Date</label>
                <input 
                  type="date" 
                  className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl p-4 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 font-bold text-gray-700 transition-all"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {markingDisabled && (
            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200 text-center animate-pulse">
              <p className="text-orange-800 font-black uppercase tracking-widest text-sm">Attendance Marking Restricted</p>
              <p className="text-xs text-orange-600 font-bold mt-1">Reason: {isFriday ? 'Friday (Locked by Owner)' : 'Holiday Schedule Active'}</p>
            </div>
          )}

          {selectedBatch ? (
            <div className={`bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500 ${markingDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                    <tr>
                      <th className="px-8 py-5">Student Identity</th>
                      <th className="px-8 py-5 text-center">Status Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {studentsInBatch.map(s => {
                      const att = attendances.find(a => a.studentId === s.id && a.date === selectedDate);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <img src={s.photo || `https://picsum.photos/seed/${s.id}/40/40`} className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm object-cover" />
                              <div>
                                <p className="font-black text-gray-800 text-base">{s.name}</p>
                                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">ROLL: {s.roll || 'N/A'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center justify-center gap-3">
                              <button 
                                onClick={() => setAttendanceStatus(s.id, 'PRESENT')}
                                className={`flex-1 sm:flex-none px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                  att?.status === 'PRESENT' 
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 scale-[1.02]' 
                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                }`}
                              >
                                Present
                              </button>
                              <button 
                                onClick={() => setAttendanceStatus(s.id, 'ABSENT')}
                                className={`flex-1 sm:flex-none px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                  att?.status === 'ABSENT' 
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-100 scale-[1.02]' 
                                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                                }`}
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-[3rem] border-4 border-dashed border-gray-50 flex flex-col items-center">
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mb-6"><span className="text-3xl opacity-40">👥</span></div>
              <p className="text-gray-400 font-black uppercase text-xs tracking-[0.2em]">Select a batch to begin marking</p>
            </div>
          )}
        </>
      )}

      {activeView === 'tracking' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm text-left">
            <h3 className="text-xl font-black text-gray-800 mb-6 uppercase tracking-tight">Missed Classes Roster</h3>
            <div className="mb-6">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Filter Batch</label>
              <select 
                className="w-full sm:w-1/2 border-2 border-slate-50 bg-slate-50 rounded-xl p-4 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 font-bold text-gray-700 transition-all appearance-none"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                <option value="">-- Choose Class --</option>
                {batches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {selectedBatch ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                    <tr>
                      <th className="px-8 py-5">Student</th>
                      <th className="px-8 py-5 text-center">Total Missed</th>
                      <th className="px-8 py-5 text-center">Tracking History</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {studentsInBatch.map(s => {
                      const missed = getMissedDates(s.id);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5 font-black text-gray-700">{s.name}</td>
                          <td className="px-8 py-5 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-xs font-black ${missed.length > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {missed.length} Classes
                            </span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <button 
                              onClick={() => setViewingHistoryId(viewingHistoryId === s.id ? null : s.id)}
                              className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-5 py-2.5 rounded-xl hover:bg-blue-100 transition-all"
                            >
                              {viewingHistoryId === s.id ? 'Close Log' : 'View Missed List'}
                            </button>
                            
                            {viewingHistoryId === s.id && (
                              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left animate-in slide-in-from-top-2 duration-300">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 pb-2 border-b border-gray-200">History of Missed Dates</p>
                                {missed.length === 0 ? (
                                  <p className="text-xs text-emerald-600 font-bold">100% Attendance Record. No classes missed.</p>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {missed.map(m => (
                                      <div key={m.id} className="bg-white px-3 py-2 rounded-lg border text-[11px] font-bold text-gray-500 shadow-sm flex items-center justify-center">
                                        🗓️ {m.date}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center py-20 text-gray-400 font-bold uppercase text-[10px] tracking-widest">Select batch to view missed class analytics</p>
            )}
          </div>
        </div>
      )}

      {activeView === 'results' && (
        <div className="space-y-6 text-left animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-left">
            <h3 className="text-xl font-black text-gray-800 mb-6 uppercase tracking-tight">Record Student Marks</h3>
            
            <div className="mb-8">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Select Class *</label>
              <select 
                className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl p-4 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 font-bold text-gray-700 transition-all appearance-none"
                value={selectedBatch}
                onChange={(e) => {
                  setSelectedBatch(e.target.value);
                  setSelectedStudentForRes(null);
                }}
              >
                <option value="">-- Choose Class --</option>
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

            {selectedBatch && !selectedStudentForRes && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Students in {selectedBatch}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.filter(u => u.role === UserRole.STUDENT && u.status === 'active' && u.batch === selectedBatch).length === 0 ? (
                    <p className="col-span-full text-center py-10 text-gray-400 italic text-sm">No students found in this class.</p>
                  ) : (
                    users.filter(u => u.role === UserRole.STUDENT && u.status === 'active' && u.batch === selectedBatch).map(s => (
                      <button 
                        key={s.id}
                        onClick={() => setSelectedStudentForRes(s)}
                        className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg hover:border-blue-200 transition-all text-left group"
                      >
                        <img src={s.photo || `https://picsum.photos/seed/${s.id}/40/40`} className="w-10 h-10 rounded-xl border border-white shadow-sm object-cover" />
                        <div>
                          <p className="font-black text-gray-800 text-sm group-hover:text-blue-600 transition-colors">{s.name}</p>
                          <p className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">ID: {s.id}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {selectedStudentForRes && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-8 rounded-3xl border border-slate-100 relative animate-in slide-in-from-bottom-4 duration-500">
                <button 
                  onClick={() => setSelectedStudentForRes(null)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <div className="md:col-span-2">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Marking Profile</p>
                  <h4 className="text-2xl font-black text-gray-800">{selectedStudentForRes.name} <span className="text-gray-400 font-mono text-sm ml-2">#{selectedStudentForRes.id}</span></h4>
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Result Type</label>
                  <select 
                    className="w-full border-2 border-white bg-white rounded-xl p-4 outline-none focus:ring-4 focus:ring-blue-50 font-bold text-gray-700"
                    value={resultForm.type}
                    onChange={(e) => setResultForm({...resultForm, type: e.target.value as any})}
                  >
                    <option value="Class Test">Class Test</option>
                    <option value="Class Exam">Class Exam</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Subject Name</label>
                  <input 
                    type="text" 
                    className="w-full border-2 border-white bg-white rounded-xl p-4 outline-none focus:ring-4 focus:ring-blue-50 font-bold text-gray-700"
                    placeholder="e.g. Physics, Math, ICT..."
                    value={resultForm.subject}
                    onChange={(e) => setResultForm({...resultForm, subject: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Obtained Marks</label>
                    <input 
                      type="number" 
                      className="w-full border-2 border-white bg-white rounded-xl p-4 outline-none focus:ring-4 focus:ring-blue-50 font-bold text-gray-700 text-center"
                      value={resultForm.marks}
                      onChange={(e) => setResultForm({...resultForm, marks: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Total Marks</label>
                    <input 
                      type="number" 
                      className="w-full border-2 border-white bg-white rounded-xl p-4 outline-none focus:ring-4 focus:ring-blue-50 font-bold text-gray-700 text-center"
                      value={resultForm.totalMarks}
                      onChange={(e) => setResultForm({...resultForm, totalMarks: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Exam Date</label>
                  <input 
                    type="date" 
                    className="w-full border-2 border-white bg-white rounded-xl p-4 outline-none focus:ring-4 focus:ring-blue-50 font-bold text-gray-700"
                    value={resultForm.date}
                    onChange={(e) => setResultForm({...resultForm, date: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2 pt-4">
                  <button 
                    onClick={handleAddResult}
                    className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
                  >
                    Save & Upload Result
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === 'leaderboard' && (
        <div className="space-y-6 text-left animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-[2.5rem] border shadow-sm text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
              <div>
                <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Academic Leaderboard</h3>
                <p className="text-xs text-gray-400 font-bold uppercase mt-1">Top 5 students based on latest Class Exam</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-left">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Filter Batch</label>
                  <select 
                    className="bg-slate-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                  >
                    <option value="">All Classes</option>
                    {batches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center text-2xl">🏆</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b">
                  <tr>
                    <th className="px-8 py-5">Rank</th>
                    <th className="px-8 py-5">Student Identity</th>
                    <th className="px-8 py-5 text-center">Latest Marks</th>
                    <th className="px-8 py-5 text-right">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {getLeaderboard().length === 0 ? (
                    <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-400 italic">No Class Exam results found to display on leaderboard.</td></tr>
                  ) : (
                    getLeaderboard().map((entry, index) => (
                      <tr key={entry.id} className={`hover:bg-blue-50/30 transition-colors ${index === 0 ? 'bg-yellow-50/10' : ''}`}>
                        <td className="px-8 py-6">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 ${
                            index === 0 ? 'bg-yellow-400 border-yellow-500 text-white' : 
                            index === 1 ? 'bg-slate-300 border-slate-400 text-white' : 
                            index === 2 ? 'bg-orange-300 border-orange-400 text-white' : 
                            'bg-slate-50 border-slate-100 text-gray-400'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <img src={users.find(u => u.id === entry.id)?.photo || `https://picsum.photos/seed/${entry.id}/40/40`} className="w-10 h-10 rounded-xl border-2 border-white shadow-sm object-cover" />
                            <div>
                              <p className="font-black text-gray-800 text-sm uppercase">{entry.name}</p>
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

      {activeView === 'notices' && (
        <div className="space-y-6 text-left">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black text-gray-800 mb-6 uppercase tracking-tight">Center Bulletins</h3>
            <div className="space-y-4">
              {notices.length === 0 ? (
                <div className="py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                  <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">No official notices found</p>
                </div>
              ) : (
                notices.map(n => (
                  <div key={n.id} className="p-6 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white transition-all shadow-sm">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">{new Date(n.timestamp).toLocaleString()}</p>
                    <h4 className="text-lg font-black text-gray-800 mb-2 leading-tight">{n.title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{n.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
