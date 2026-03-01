
import React from 'react';
import { User, UserRole } from '../types';
import { CENTER_NAME } from '../constants';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto flex justify-between items-center max-w-7xl">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase">{CENTER_NAME}</span>
          <span className="text-lg font-bold text-gray-800">Dashboard</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-900">{user.name}</span>
            <span className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</span>
          </div>
          <button 
            onClick={onLogout}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
