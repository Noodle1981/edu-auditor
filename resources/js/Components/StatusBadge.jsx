import React from 'react';

export const StatusBadge = ({ status }) => {
  const getStatusStyles = () => {
    switch (status.toUpperCase()) {
      case 'TITULAR':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'INTERINO':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'SUPLENTE':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'REEMPLAZANTE':
        return 'bg-cyan-50 text-cyan-700 border-cyan-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${getStatusStyles()}`}>
      {status}
    </span>
  );
};
