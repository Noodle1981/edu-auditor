import React from 'react';

export const GlassCard = ({ children, className = '' }) => {
  return (
    <div className={`glass p-6 ${className}`}>
      {children}
    </div>
  );
};
