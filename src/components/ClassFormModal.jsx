import React, { useState, useEffect } from 'react';

const ClassFormModal = ({ classItem, onSave, onClose }) => {
  const isEditing = !!classItem;
  const [formData, setFormData] = useState({
    title: '',
    batchname: '',
    streamlink: '',
    thumbnail: '',
    scheduledstarttime: '',
    autostart: false,
    autoend: false,
    autoendduration: 120,
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
        autoend: classItem.autoend || false,
        autoendduration: classItem.autoendduration || 120,
      });
    } else {
      // Reset for new class
      setFormData({
        title: '', batchname: '', streamlink: '', thumbnail: '',
        scheduledstarttime: '', autostart: false, autoend: false, autoendduration: 120,
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
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="backdrop-blur-xl bg-gray-900/80 border border-gray-700/60 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6">{isEditing ? 'Edit Class' : 'Create New Class'}</h2>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full p-3 border border-gray-600/50 rounded-xl bg-gray-800/40 text-white backdrop-blur-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Batch Name</label>
            <input type="text" name="batchname" value={formData.batchname} onChange={handleChange} className="w-full p-3 border border-gray-600/50 rounded-xl bg-gray-800/40 text-white backdrop-blur-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Stream Link</label>
            <input type="text" name="streamlink" value={formData.streamlink} onChange={handleChange} className="w-full p-3 border border-gray-600/50 rounded-xl bg-gray-800/40 text-white backdrop-blur-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Thumbnail URL (Optional)</label>
            <input type="text" name="thumbnail" value={formData.thumbnail} onChange={handleChange} className="w-full p-3 border border-gray-600/50 rounded-xl bg-gray-800/40 text-white backdrop-blur-lg" />
          </div>
          <hr className="border-gray-700/50"/>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Scheduled Start Time</label>
            <input type="datetime-local" name="scheduledstarttime" value={formData.scheduledstarttime} onChange={handleChange} className="w-full p-3 border border-gray-600/50 rounded-xl bg-gray-800/40 text-white backdrop-blur-lg" />
          </div>
          <div className="flex items-center space-x-3">
            <input type="checkbox" id="autostart" name="autostart" checked={formData.autostart} onChange={handleChange} className="w-4 h-4 text-blue-600 bg-gray-700/60 border-gray-600/50 rounded backdrop-blur-lg" />
            <label htmlFor="autostart" className="text-sm text-gray-300">Auto-start at scheduled time</label>
          </div>
          <div className="flex items-center space-x-3">
            <input type="checkbox" id="autoend" name="autoend" checked={formData.autoend} onChange={handleChange} className="w-4 h-4 text-blue-600 bg-gray-700/60 border-gray-600/50 rounded backdrop-blur-lg" />
            <label htmlFor="autoend" className="text-sm text-gray-300">Auto-end after duration</label>
          </div>
          {formData.autoend && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Auto-end Duration (minutes)</label>
              <input type="number" name="autoendduration" value={formData.autoendduration} onChange={handleChange} min="30" max="480" className="w-full p-3 border border-gray-600/50 rounded-xl bg-gray-800/40 text-white backdrop-blur-lg" />
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-300 border border-gray-600/50 rounded-xl hover:bg-gray-800/40 transition-colors backdrop-blur-lg">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 bg-blue-600/80 border border-blue-500/60 text-white rounded-xl hover:bg-blue-600/90 transition-all backdrop-blur-lg">
            {isEditing ? 'Save Changes' : 'Create Class'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassFormModal;
