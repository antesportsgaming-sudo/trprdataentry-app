
import React, { useState, useEffect } from 'react';
import { FACULTIES } from '../constants';
import { FacultyUser } from '../types';
import { Lock, UserCircle, Key } from 'lucide-react';

interface LoginProps {
  onLogin: (user: FacultyUser) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [selectedId, setSelectedId] = useState(FACULTIES[0].id);
  const [password, setPassword] = useState('');
  const [allowedIds, setAllowedIds] = useState<string[]>(['medical']);
  const [error, setError] = useState('');

  // Load allowed faculties from localStorage
  useEffect(() => {
      const savedAccess = localStorage.getItem('allowed_faculties');
      if (savedAccess) {
          const ids = JSON.parse(savedAccess);
          // Ensure Medical is always allowed as fallback
          if (!ids.includes('medical')) ids.push('medical');
          setAllowedIds(ids);
      } else {
          // Default state if nothing saved: Only Medical allowed (until Admin gives permission)
          setAllowedIds(['medical']);
      }
  }, []);

  // Filter the full list based on allowed IDs
  const visibleFaculties = FACULTIES.filter(f => allowedIds.includes(f.id));

  // Reset selectedId if it's not in the visible list anymore (unless it's loading initial state)
  useEffect(() => {
      if (visibleFaculties.length > 0 && !visibleFaculties.find(f => f.id === selectedId)) {
          setSelectedId(visibleFaculties[0].id);
      }
  }, [visibleFaculties, selectedId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== '1234') {
        setError('Invalid Password. Please try again.');
        return;
    }

    const user = FACULTIES.find(f => f.id === selectedId);
    if (user) {
      onLogin(user);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
        <div className="text-center mb-8">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                <UserCircle size={40} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Faculty Login</h1>
            <p className="text-sm text-gray-500 mt-2">Select your faculty to access the examination system</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Faculty
            </label>
            <div className="relative">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white transition-all text-black"
              >
                {visibleFaculties.map(faculty => (
                  <option key={faculty.id} value={faculty.id} className="text-black">
                    {faculty.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Password
             </label>
             <div className="relative">
                 <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-black placeholder-gray-400"
                    placeholder="Enter Password"
                 />
                 <div className="absolute inset-y-0 left-0 flex items-center px-3 pointer-events-none text-gray-400">
                     <Key size={18} />
                 </div>
             </div>
          </div>

          {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                  {error}
              </div>
          )}

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Lock className="w-4 h-4 mr-2" />
            Access Dashboard
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-gray-400">
            <p>Secure Examination Management System v1.3</p>
            <p className="mt-2 font-medium text-gray-500">Designed & Developed by Kiran Pawar</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
