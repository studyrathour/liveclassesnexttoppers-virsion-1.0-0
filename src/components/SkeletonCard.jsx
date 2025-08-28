import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="backdrop-blur-xl bg-gray-900/60 border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
      <div className="aspect-video bg-gray-800/80 animate-pulse"></div>
      <div className="p-6">
        <div className="h-5 bg-gray-700/60 rounded w-3/4 mb-4 animate-pulse"></div>
        <div className="h-4 bg-gray-700/60 rounded w-1/2 mb-3 animate-pulse"></div>
        <div className="h-4 bg-gray-700/60 rounded w-1/3 mb-6 animate-pulse"></div>
        <div className="h-12 bg-gray-700/60 rounded-xl animate-pulse"></div>
      </div>
    </div>
  );
};

export default SkeletonCard;
