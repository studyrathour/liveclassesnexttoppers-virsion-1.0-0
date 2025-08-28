import React from 'react';

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4">
      <div className="flex items-center">
        <div className="h-12 w-12 bg-gray-700/60 rounded-xl mr-4 flex-shrink-0"></div>
        <div>
          <div className="h-4 bg-gray-700/60 rounded w-48 mb-2"></div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-700/60 rounded w-24"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-700/60 rounded w-16"></div></td>
    <td className="px-6 py-4"><div className="h-6 bg-gray-700/60 rounded-full w-24"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-700/60 rounded w-20"></div></td>
    <td className="px-6 py-4">
      <div className="flex space-x-3">
        <div className="h-5 w-5 bg-gray-700/60 rounded"></div>
        <div className="h-5 w-5 bg-gray-700/60 rounded"></div>
        <div className="h-5 w-5 bg-gray-700/60 rounded"></div>
      </div>
    </td>
  </tr>
);

const SkeletonTable = ({ rows = 5 }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-800/40">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Class Details</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Batch</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Quality</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Schedule</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {Array.from({ length: rows }).map((_, index) => (
            <SkeletonRow key={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SkeletonTable;
