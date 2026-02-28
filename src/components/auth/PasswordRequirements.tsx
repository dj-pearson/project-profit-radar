import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface PasswordRequirementsProps {
  password: string;
  idPrefix: string;
}

const getStatus = (requirement: string, pwd: string): boolean => {
  switch (requirement) {
    case 'length': return pwd.length >= 8;
    case 'lowercase': return /[a-z]/.test(pwd);
    case 'uppercase': return /[A-Z]/.test(pwd);
    case 'number': return /\d/.test(pwd);
    case 'special': return /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    default: return false;
  }
};

const requirements = [
  { key: 'length', text: 'At least 8 characters' },
  { key: 'lowercase', text: 'One lowercase letter' },
  { key: 'uppercase', text: 'One uppercase letter' },
  { key: 'number', text: 'One number' },
  { key: 'special', text: 'One special character' },
];

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password, idPrefix }) => (
  <div id={`${idPrefix}-requirements`} className="space-y-1.5 p-3 rounded-lg bg-slate-800/50 border border-white/5" role="status" aria-live="polite">
    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password Requirements</p>
    <ul className="space-y-1" aria-label="Password requirements checklist">
      {requirements.map(({ key, text }) => {
        const met = getStatus(key, password);
        return (
          <li key={key} className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-400' : 'text-slate-500'}`}>
            {met ? (
              <CheckCircle className="h-3 w-3" aria-hidden="true" />
            ) : (
              <XCircle className="h-3 w-3" aria-hidden="true" />
            )}
            <span>{text}</span>
          </li>
        );
      })}
    </ul>
  </div>
);
