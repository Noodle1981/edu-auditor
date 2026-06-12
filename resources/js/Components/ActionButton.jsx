import React from 'react';

export const ActionButton = ({ onClick, icon, label, variant = 'primary' }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-50 hover:bg-red-100/50 text-red-600 border border-red-100';
      case 'secondary':
        return 'bg-gray-50 hover:bg-gray-100/50 text-gray-600 border border-gray-100';
      default:
        return 'bg-amber-50 hover:bg-amber-100/50 text-amber-600 border border-[#FE8204]/10';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${getVariantStyles()}`}
    >
      <i className={icon}></i>
      {label}
    </button>
  );
};
