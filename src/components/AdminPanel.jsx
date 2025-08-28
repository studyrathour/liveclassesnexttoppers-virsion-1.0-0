import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Trash2, Play, Square, Edit, FileSpreadsheet, LogOut, PlusCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, addHours } from 'date-fns';
import { supabase } from '../supabaseClient';
import ClassFormModal from './ClassFormModal';
import SkeletonTable from './SkeletonTable';

const AdminPanel = () => {
  const [liveClasses, setLiveClasses] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadLiveClasses();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
      alert('Error logging out. Please try again.');
    } else {
      navigate('/admin-login');
    }
  };

  const loadLiveClasses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching classes:', error);
      alert('Could not fetch classes from the database.');
    } else {
      setLiveClasses(data);
    }
    setLoading(false);
  };

  const cleanTitle = (title) => {
    return title ? title.replace(/⚡/g, '').trim() : '';
  };

  const extractVideoQuality = (url) => {
    const match = url.match(/index_(\d+)\.m3u8/);
    return match ? parseInt(match[1]) : 3;
  };

  const extractM3U8Link = (fullUrl) => {
    const urlMatch = fullUrl.match(/url=(.+)/);
    return urlMatch ? decodeURIComponent(urlMatch[1]) : fullUrl;
  };

  const handleFileUpload = (event, replace = false) => {
    const file = event.target.files[0];
    if (!file) return;

    if (replace && !confirm('This will replace all existing classes. Are you sure?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          range: 1,
          header: ['thumbnail', 'title', 'batchName', 'streamLink']
        });

        const newClasses = jsonData.map((row) => ({
          thumbnail: row.thumbnail || '',
          title: cleanTitle(row.title || ''),
          batchname: cleanTitle(row.batchName || ''),
          streamlink: row.streamLink || '',
          m3u8link: extractM3U8Link(row.streamLink || ''),
          defaultquality: extractVideoQuality(extractM3U8Link(row.streamLink || '')),
          status: 'scheduled',
          starttime: new Date().toISOString(),
          scheduledstarttime: null,
          endtime: null,
          autoendtime: null,
          autostart: false,
          autoend: false,
          autoendduration: 120
        }));

        if (replace) {
          const { error: deleteError } = await supabase.from('classes').delete().neq('id', 0);
          if (deleteError) throw deleteError;
        }

        const { error: insertError } = await supabase.from('classes').insert(newClasses);
        if (insertError) throw insertError;

        loadLiveClasses();
        setShowUploadModal(false);
      } catch (error) {
        console.error('Error processing file:', error);
        alert(`Error processing Excel file: ${error.message}. Please check the format and your database connection.`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveClass = async (formData) => {
    const isEditing = !!editingClass;
    
    const classData = {
      title: cleanTitle(formData.title),
      batchname: cleanTitle(formData.batchname),
      streamlink: formData.streamlink,
      thumbnail: formData.thumbnail,
      m3u8link: extractM3U8Link(formData.streamlink),
      defaultquality: extractVideoQuality(extractM3U8Link(formData.streamlink)),
      scheduledstarttime: formData.scheduledstarttime ? new Date(formData.scheduledstarttime).toISOString() : null,
      autostart: formData.autostart,
      autoend: formData.autoend,
      autoendduration: parseInt(formData.autoendduration),
    };

    let error;
    if (isEditing) {
      const { error: updateError } = await supabase
        .from('classes')
        .update(classData)
        .eq('id', editingClass.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('classes')
        .insert({ ...classData, status: 'scheduled', starttime: new Date().toISOString() });
      error = insertError;
    }

    if (error) {
      alert(`Error saving class: ${error.message}`);
    } else {
      setIsFormModalOpen(false);
      setEditingClass(null);
      loadLiveClasses();
    }
  };

  const startLive = async (classId) => {
    const classToUpdate = liveClasses.find(c => c.id === classId);
    if (!classToUpdate) return;

    const { error } = await supabase
      .from('classes')
      .update({ 
        status: 'live', 
        starttime: new Date().toISOString(),
        autoendtime: classToUpdate.autoend ? addHours(new Date(), classToUpdate.autoendduration / 60).toISOString() : null
      })
      .eq('id', classId);

    if (error) alert('Error starting class.');
    else loadLiveClasses();
  };

  const endLive = async (classId) => {
    const { error } = await supabase
      .from('classes')
      .update({ status: 'completed', endtime: new Date().toISOString() })
      .eq('id', classId);

    if (error) alert('Error ending class.');
    else loadLiveClasses();
  };

  const deleteClass = async (classId) => {
    if (confirm('Are you sure you want to delete this class?')) {
      const { error } = await supabase.from('classes').delete().eq('id', classId);
      if (error) alert('Error deleting class.');
      else loadLiveClasses();
    }
  };

  const openCreateModal = () => {
    setEditingClass(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (classItem) => {
    setEditingClass(classItem);
    setIsFormModalOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'live': return 'bg-red-600/80 border-red-500/60 text-white shadow-lg shadow-red-500/25';
      case 'scheduled': return 'bg-blue-600/80 border-blue-500/60 text-white shadow-lg shadow-blue-500/25';
      case 'completed': return 'bg-green-600/80 border-green-500/60 text-white shadow-lg shadow-green-500/25';
      default: return 'bg-gray-600/60 border-gray-500/50 text-white';
    }
  };

  const getQualityText = (quality) => {
    switch (quality) {
      case 1: return '240p';
      case 2: return '360p';
      case 3: return '480p';
      case 4:
      case 5: return '720p';
      default: return '480p';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex space-x-4">
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-purple-600/80 border border-purple-500/60 text-white px-6 py-3 rounded-xl hover:bg-purple-600/90 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25 backdrop-blur-lg"
          >
            <PlusCircle className="h-5 w-5" />
            <span>Create Class</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-2 bg-blue-600/80 border border-blue-500/60 text-white px-6 py-3 rounded-xl hover:bg-blue-600/90 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-blue-500/25 backdrop-blur-lg"
          >
            <Upload className="h-5 w-5" />
            <span>Upload Excel</span>
          </button>
          
          <label className="flex items-center space-x-2 bg-green-600/80 border border-green-500/60 text-white px-6 py-3 rounded-xl hover:bg-green-600/90 transition-all duration-300 transform hover:scale-105 cursor-pointer shadow-lg shadow-green-500/25 backdrop-blur-lg">
            <FileSpreadsheet className="h-5 w-5" />
            <span>Replace All</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileUpload(e, true)}
              className="hidden"
            />
          </label>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 bg-red-600/80 border border-red-500/60 text-white px-6 py-3 rounded-xl hover:bg-red-600/90 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/25 backdrop-blur-lg"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="backdrop-blur-xl bg-gray-900/60 border border-gray-700/50 p-6 rounded-2xl shadow-2xl">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Total Classes</h3>
          <p className="text-3xl font-bold text-white">{liveClasses.length}</p>
        </div>
        <div className="backdrop-blur-xl bg-gray-900/60 border border-gray-700/50 p-6 rounded-2xl shadow-2xl">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Live Now</h3>
          <div className="flex items-center">
            <p className="text-3xl font-bold text-red-400">
              {liveClasses.filter(cls => cls.status === 'live').length}
            </p>
            {liveClasses.filter(cls => cls.status === 'live').length > 0 && (
              <div className="w-3 h-3 bg-red-500 rounded-full ml-2 animate-pulse shadow-lg shadow-red-500/50"></div>
            )}
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gray-900/60 border border-gray-700/50 p-6 rounded-2xl shadow-2xl">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Scheduled</h3>
          <p className="text-3xl font-bold text-blue-400">
            {liveClasses.filter(cls => cls.status === 'scheduled').length}
          </p>
        </div>
        <div className="backdrop-blur-xl bg-gray-900/60 border border-gray-700/50 p-6 rounded-2xl shadow-2xl">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Completed</h3>
          <p className="text-3xl font-bold text-green-400">
            {liveClasses.filter(cls => cls.status === 'completed').length}
          </p>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-gray-900/60 border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700/50">
          <h2 className="text-xl font-semibold text-white">Live Classes</h2>
        </div>
        
        {loading ? (
          <SkeletonTable />
        ) : (
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
                {liveClasses.length > 0 ? liveClasses.map((classItem) => (
                  <tr key={classItem.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gray-700/60 border border-gray-600/50 rounded-xl mr-4 flex-shrink-0 overflow-hidden backdrop-blur-lg">
                          {classItem.thumbnail ? (
                            <img src={classItem.thumbnail} alt={classItem.title} className="h-12 w-12 rounded-xl object-cover" />
                          ) : (
                            <div className="h-12 w-12 bg-gray-700/40 rounded-xl"></div>
                          )}
                        </div>
                        <div><p className="text-sm font-medium text-white line-clamp-2">{classItem.title}</p></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{classItem.batchname}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{getQualityText(classItem.defaultquality)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border backdrop-blur-lg ${getStatusColor(classItem.status)}`}>
                        {classItem.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div>
                        {classItem.scheduledstarttime ? (
                          <div>
                            <div>{format(new Date(classItem.scheduledstarttime), 'MMM dd, hh:mm a')}</div>
                            {classItem.autostart && <div className="text-xs text-blue-400">Auto-start</div>}
                            {classItem.autoend && <div className="text-xs text-red-400">Auto-end: {classItem.autoendduration}m</div>}
                          </div>
                        ) : (
                          <button onClick={() => openEditModal(classItem)} className="text-blue-400 hover:text-blue-300 text-xs">Set Schedule</button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="flex space-x-3">
                        {classItem.status === 'scheduled' && (
                          <button onClick={() => startLive(classItem.id)} className="text-green-400 hover:text-green-300 transition-colors" title="Start Live"><Play className="h-5 w-5" /></button>
                        )}
                        {classItem.status === 'live' && (
                          <button onClick={() => endLive(classItem.id)} className="text-red-400 hover:text-red-300 transition-colors" title="End Live"><Square className="h-5 w-5" /></button>
                        )}
                        <button onClick={() => openEditModal(classItem)} className="text-blue-400 hover:text-blue-300 transition-colors" title="Edit"><Edit className="h-5 w-5" /></button>
                        <button onClick={() => deleteClass(classItem.id)} className="text-red-400 hover:text-red-300 transition-colors" title="Delete"><Trash2 className="h-5 w-5" /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="text-center py-12">
                      <div className="backdrop-blur-xl bg-gray-900/60 border border-gray-700/50 rounded-2xl p-8 mx-6">
                        <PlusCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No classes found</h3>
                        <p className="text-gray-300">Create a class or upload an Excel file to get started.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="backdrop-blur-xl bg-gray-900/80 border border-gray-700/60 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Upload Excel File</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-300 mb-2">Excel file should have 4 columns:</p>
              <ul className="text-sm text-gray-300 list-disc list-inside space-y-1">
                <li>Column 1: Thumbnail URL</li>
                <li>Column 2: Class Title (⚡ emoji will be auto-removed)</li>
                <li>Column 3: Batch Name (⚡ emoji will be auto-removed)</li>
                <li>Column 4: Stream Link</li>
              </ul>
              <p className="text-xs text-gray-400 mt-2">Note: Data will be imported from row 2 onwards (header row will be skipped)</p>
            </div>
            <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, false)} className="w-full mb-4 p-3 border border-gray-600/50 rounded-xl bg-gray-800/40 text-white backdrop-blur-lg" />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-gray-300 border border-gray-600/50 rounded-xl hover:bg-gray-800/40 transition-colors backdrop-blur-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isFormModalOpen && (
        <ClassFormModal 
          classItem={editingClass}
          onSave={handleSaveClass}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingClass(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminPanel;
