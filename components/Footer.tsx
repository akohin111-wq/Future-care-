
import React from 'react';
import { DEVELOPER_INFO } from '../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-100 py-6 mt-12">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-gray-500">
          Developed by: <span className="font-bold text-gray-800">{DEVELOPER_INFO.name}</span>
        </p>
        <div className="mt-1 flex justify-center gap-4 text-xs text-gray-400">
          <span>Email: {DEVELOPER_INFO.email}</span>
          <span>WhatsApp: {DEVELOPER_INFO.whatsapp}</span>
        </div>
        <p className="mt-4 text-[10px] text-gray-300 uppercase tracking-widest">
          &copy; {new Date().getFullYear()} Future Care Coaching Center
        </p>
      </div>
    </footer>
  );
};

export default Footer;
