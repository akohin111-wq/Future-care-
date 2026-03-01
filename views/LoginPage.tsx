
import React, { useState } from 'react';
import { CENTER_NAME } from '../constants';
import { AdmissionApplication } from '../types';

interface LoginPageProps {
  onLogin: (id: string, pass: string) => void;
  onApplyAdmission: (application: Omit<AdmissionApplication, 'id' | 'timestamp'>) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onApplyAdmission }) => {
  const [view, setView] = useState<'login' | 'admission'>('login');
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Admission Form State
  const [admissionForm, setAdmissionForm] = useState({
    studentName: '',
    phone: '',
    schoolCollege: '',
    admissionClass: '',
    sscGPA: '',
    sscRoll: '',
    sscReg: '',
    board: '',
    department: ''
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(id, pass);
  };

  const handleAdmissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyAdmission(admissionForm);
    // Reset form
    setAdmissionForm({
      studentName: '',
      phone: '',
      schoolCollege: '',
      admissionClass: '',
      sscGPA: '',
      sscRoll: '',
      sscReg: '',
      board: '',
      department: ''
    });
    setView('login');
  };

  const isCandidate = ['SSC Candidate', 'Inter 1st Year', 'Inter 2nd Year', 'HSC Candidate'].includes(admissionForm.admissionClass);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 border border-gray-100 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-blue-100">FC</div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 leading-tight tracking-tight">
            {CENTER_NAME}
          </h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em]">Education Management</p>
        </div>

        <div className="flex gap-2 mb-8 bg-slate-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setView('login')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Log In
          </button>
          <button 
            onClick={() => setView('admission')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'admission' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Online Admission
          </button>
        </div>

        {view === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div className="text-left">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Secure Account ID</label>
              <input 
                type="text" 
                required
                className="w-full px-5 py-4 rounded-xl border-2 border-gray-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold text-gray-800 text-lg"
                placeholder="Enter Identity No."
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
            </div>
            <div className="text-left">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Secret Password</label>
              <div className="relative">
                <input 
                  type={showPass ? "text" : "password"} 
                  required
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold text-gray-800 text-lg"
                  placeholder="••••••••"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {showPass ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 px-4 rounded-2xl transition-all shadow-xl shadow-blue-100 active:scale-[0.98] uppercase tracking-widest text-xs"
            >
              Access Dashboard
            </button>
          </form>
        ) : (
          <form onSubmit={handleAdmissionSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
            <div className="text-left">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Student Name</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                placeholder="Full Name"
                value={admissionForm.studentName}
                onChange={(e) => setAdmissionForm({...admissionForm, studentName: e.target.value})}
              />
            </div>
            <div className="text-left">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Phone Number</label>
              <input 
                type="tel" 
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                placeholder="01XXXXXXXXX"
                value={admissionForm.phone}
                onChange={(e) => setAdmissionForm({...admissionForm, phone: e.target.value})}
              />
            </div>
            <div className="text-left">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">School / College Name</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                placeholder="Current Institution"
                value={admissionForm.schoolCollege}
                onChange={(e) => setAdmissionForm({...admissionForm, schoolCollege: e.target.value})}
              />
            </div>
            <div className="text-left">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Admission Class</label>
              <select 
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                value={admissionForm.admissionClass}
                onChange={(e) => setAdmissionForm({...admissionForm, admissionClass: e.target.value})}
              >
                <option value="">-- Select Class --</option>
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

            {isCandidate && (
              <div className="space-y-4 pt-4 border-t border-gray-100 animate-in fade-in duration-500">
                <div className="text-left">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">SSC GPA</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                    placeholder="e.g. 5.00"
                    value={admissionForm.sscGPA}
                    onChange={(e) => setAdmissionForm({...admissionForm, sscGPA: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-left">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">SSC Roll</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                      placeholder="Roll No"
                      value={admissionForm.sscRoll}
                      onChange={(e) => setAdmissionForm({...admissionForm, sscRoll: e.target.value})}
                    />
                  </div>
                  <div className="text-left">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">SSC Reg</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                      placeholder="Reg No"
                      value={admissionForm.sscReg}
                      onChange={(e) => setAdmissionForm({...admissionForm, sscReg: e.target.value})}
                    />
                  </div>
                </div>
                <div className="text-left">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Board Selection</label>
                  <select 
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                    value={admissionForm.board}
                    onChange={(e) => setAdmissionForm({...admissionForm, board: e.target.value})}
                  >
                    <option value="">-- Select Board --</option>
                    <option value="Dhaka">Dhaka</option>
                    <option value="Mymensingh">Mymensingh</option>
                    <option value="Dinajpur">Dinajpur</option>
                    <option value="Chittagong">Chittagong</option>
                    <option value="Barisal">Barisal</option>
                    <option value="Comilla">Comilla</option>
                    <option value="Jessore">Jessore</option>
                    <option value="Rajshahi">Rajshahi</option>
                    <option value="Sylhet">Sylhet</option>
                  </select>
                </div>
                <div className="text-left">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Department</label>
                  <select 
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                    value={admissionForm.department}
                    onChange={(e) => setAdmissionForm({...admissionForm, department: e.target.value})}
                  >
                    <option value="">-- Select Dept --</option>
                    <option value="Science">Science</option>
                    <option value="Arts">Arts</option>
                  </select>
                </div>
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-4 rounded-2xl transition-all shadow-xl shadow-blue-100 active:scale-[0.98] uppercase tracking-widest text-xs mt-4"
            >
              Submit Application
            </button>
          </form>
        )}

        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-300 mb-2 uppercase font-black tracking-widest leading-loose">Locked Environment</p>
          <p className="text-[11px] text-gray-400 font-bold px-4">Contact coaching administration for account provisioning and role-based access keys.</p>
        </div>
      </div>
      
      <div className="mt-12 text-center text-gray-300 text-[10px] font-black uppercase tracking-[0.3em]">
        <p>Enterprise Edition v3.0.1</p>
      </div>
    </div>
  );
};

export default LoginPage;
