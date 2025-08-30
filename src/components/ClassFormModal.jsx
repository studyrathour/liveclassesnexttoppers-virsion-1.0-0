import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const ClassFormModal = ({ classItem, onSave, onClose }) => {
  const isEditing = !!classItem;
  const [formData, setFormData] = useState({
    title: '',
    batchname: '',
    streamlink: '',
    thumbnail: '',
    scheduledstarttime: '',
    autostart: false,
  });

  useEffect(() => {
    if (isEditing) {
      setFormData({
        title: classItem.title || '',
        batchname: classItem.batchname || '',
        streamlink: classItem.streamlink || '',
        thumbnail: classItem.thumbnail || '',
        scheduledstarttime: classItem.scheduledstarttime ? new Date(classItem.scheduledstarttime).toISOString().slice(0, 16) : '',
        autostart: classItem.autostart || false,
      });
    } else {
      // Reset for new class
      setFormData({
        title: '', batchname: '', streamlink: '', thumbnail: '',
        scheduledstarttime: '', autostart: false,
      });
    }
  }, [classItem, isEditing]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = () => {
    if (!formData.title.trim() || !formData.batchname.trim() || !formData.streamlink.trim()) {
      alert('Please fill in all required fields (Title, Batch Name, and Stream Link).');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-2xl bg-slate-900/[.85] border border-slate-700 rounded-2xl p-4 sm:p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in-scale">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-white">{isEditing ? 'Edit Class' : 'Create New Class'}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              className="w-full p-3 border border-slate-600 rounded-xl bg-slate-800/50 text-white backdrop-blur-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all" 
              placeholder="Enter class title"
              required 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Batch Name *</label>
            <input 
              type="text" 
              name="batchname" 
              value={formData.batchname} 
              onChange={handleChange} 
              className="w-full p-3 border border-slate-600 rounded-xl bg-slate-800/50 text-white backdrop-blur-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all" 
              placeholder="Enter batch name"
              required 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Stream Link *</label>
            <textarea 
              name="streamlink" 
              value={formData.streamlink} 
              onChange={handleChange} 
              rows="3"
              className="w-full p-3 border border-slate-600 rounded-xl bg-slate-800/50 text-white backdrop-blur-lg text-sm sm:text-base resize-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all" 
              placeholder="Enter stream link"
              required 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Thumbnail URL (Optional)</label>
            <input 
              type="url" 
              name="thumbnail" 
              value={formData.thumbnail} 
              onChange={handleChange} 
              className="w-full p-3 border border-slate-600 rounded-xl bg-slate-800/50 text-white backdrop-blur-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all" 
              placeholder="Enter thumbnail URL"
            />
          </div>
          
          <hr className="border-slate-700"/>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Scheduled Start Time</label>
            <input 
              type="datetime-local" 
              name="scheduledstarttime" 
              value={formData.scheduledstarttime} 
              onChange={handleChange} 
              className="w-full p-3 border border-slate-600 rounded-xl bg-slate-800/50 text-white backdrop-blur-lg text-sm sm:text-base" 
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <input 
              type="checkbox" 
              id="autostart" 
              name="autostart" 
              checked={formData.autostart} 
              onChange={handleChange} 
              className="w-4 h-4 text-blue-600 bg-slate-700/60 border-slate-600 rounded backdrop-blur-lg" 
            />
            <label htmlFor="autostart" className="text-sm text-gray-300">Auto-start at scheduled time</label>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-gray-300 border border-slate-600 rounded-xl hover:bg-slate-800/40 transition-colors backdrop-blur-lg text-sm order-2 sm:order-1"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="px-6 py-2 bg-blue-600/80 border border-blue-500/60 text-white rounded-xl hover:bg-blue-600/90 transition-all backdrop-blur-lg text-sm order-1 sm:order-2 hover:shadow-glow-blue"
          >
            {isEditing ? 'Save Changes' : 'Create Class'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassFormModal;
