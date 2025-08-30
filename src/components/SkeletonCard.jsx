import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="lecture-card animate-pulse">
      <div className="lecture-thumbnail bg-slate-800/60"></div>
      <div className="lecture-content">
        <div className="h-6 bg-slate-700/50 rounded-lg w-1/3 mb-5"></div>
        <div className="h-7 bg-slate-700/50 rounded-lg w-full mb-3"></div>
        <div className="h-7 bg-slate-700/50 rounded-lg w-4/5 mb-4"></div>
        
        <div className="space-y-3 mb-6">
            <div className="h-10 bg-slate-700/50 rounded-lg w-full"></div>
            <div className="h-10 bg-slate-700/50 rounded-lg w-full"></div>
        </div>
        
        <div className="h-12 bg-slate-700/50 rounded-2xl w-full"></div>
      </div>
    </div>
  );
};

export default SkeletonCard;
