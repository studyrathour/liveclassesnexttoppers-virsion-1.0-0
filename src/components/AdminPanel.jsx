import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Trash2, Play, Square, Edit, FileSpreadsheet, LogOut, PlusCircle, RotateCcw, Archive, Clock, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, addMinutes, isBefore } from 'date-fns';
import { supabase } from '../supabaseClient';
import ClassFormModal from './ClassFormModal';
import SkeletonTable from './SkeletonTable';

const AdminPanel = () => {
  const [liveClasses, setLiveClasses] = useState([]);
  const [activeTab, setActiveTab] = useState('live');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTarget, setUploadTarget] = useState('scheduled');
  const [editingClass, setEditingClass] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadLiveClasses();
    const interval = setInterval(checkAutoEndClasses, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
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
      setLiveClasses(data || []);
    }
    setLoading(false);
  };

  const checkAutoEndClasses = async () => {
    const now = new Date();
    const classesToEnd = liveClasses.filter(cls => 
      cls.status === 'live' && 
      cls.autoendtime && 
      isBefore(new Date(cls.autoendtime), now)
    );

    if (classesToEnd.length > 0) {
      const updates = classesToEnd.map(cls => 
        supabase
          .from('classes')
          .update({ 
            status: 'completed', 
            endtime: now.toISOString() 
          })
          .eq('id', cls.id)
      );

      await Promise.all(updates);
      loadLiveClasses();
    }
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

  const categorizeClasses = () => {
    return {
      live: liveClasses.filter(cls => cls.status === 'live'),
      scheduled: liveClasses.filter(cls => cls.status === 'scheduled'),
      completed: liveClasses.filter(cls => cls.status === 'completed'),
      deleted: liveClasses.filter(cls => cls.status === 'deleted')
    };
  };

  const { live, scheduled, completed, deleted } = categorizeClasses();

  const getCurrentClasses = () => {
    switch (activeTab) {
      case 'live': return live;
      case 'scheduled': return scheduled;
      case 'completed': return completed;
      case 'deleted': return deleted;
      default: return [];
    }
  };

  const handleFileUpload = (event, replace = false, targetStatus = 'scheduled') => {
    const file = event.target.files[0];
    if (!file) return;

    if (replace && !confirm(`This will replace all existing classes in the "${targetStatus}" section. Are you sure?`)) {
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
          status: targetStatus,
          starttime: targetStatus === 'live' ? new Date().toISOString() : null,
          scheduledstarttime: null,
          endtime: targetStatus === 'completed' ? new Date().toISOString() : null,
          autoendtime: targetStatus === 'live' ? addMinutes(new Date(), 105).toISOString() : null,
          autostart: false,
        }));

        if (replace) {
          const { error: deleteError } = await supabase
            .from('classes')
            .delete()
            .eq('status', targetStatus);
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
        .insert({ ...classData, status: 'scheduled' });
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
    const startTime = new Date();
    const endTime = addMinutes(startTime, 105);

    const { error } = await supabase
      .from('classes')
      .update({ 
        status: 'live', 
        starttime: startTime.toISOString(),
        autoendtime: endTime.toISOString()
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
      const { error } = await supabase
        .from('classes')
        .update({ status: 'deleted' })
        .eq('id', classId);
      if (error) alert('Error deleting class.');
      else loadLiveClasses();
    }
  };

  const recoverClass = async (classId) => {
    if (confirm('Are you sure you want to recover this class?')) {
      const { error } = await supabase
        .from('classes')
        .update({ status: 'scheduled' })
        .eq('id', classId);
      if (error) alert('Error recovering class.');
      else loadLiveClasses();
    }
  };

  const permanentDeleteClass = async (classId) => {
    if (confirm('Are you sure you want to permanently delete this class? This action cannot be undone.')) {
      const { error } = await supabase.from('classes').delete().eq('id', classId);
      if (error) alert('Error permanently deleting class.');
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

  const openUploadModal = (target) => {
    setUploadTarget(target);
    setShowUploadModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'live': return 'bg-red-600/80 border-red-500/60 text-white';
      case 'scheduled': return 'bg-blue-600/80 border-blue-500/60 text-white';
      case 'completed': return 'bg-green-600/80 border-green-500/60 text-white';
      case 'deleted': return 'bg-gray-600/80 border-gray-500/60 text-white';
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

  const tabs = [
    { id: 'live', label: 'Live', shortLabel: 'Live', count: live.length, icon: Play, color: 'red' },
    { id: 'scheduled', label: 'Scheduled', shortLabel: 'Sched.', count: scheduled.length, icon: Clock, color: 'blue' },
    { id: 'completed', label: 'Completed', shortLabel: 'Done', count: completed.length, icon: CheckCircle, color: 'green' },
    { id: 'deleted', label: 'Deleted', shortLabel: 'Bin', count: deleted.length, icon: Archive, color: 'gray' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-purple-600/80 border border-purple-500/60 text-white px-4 py-3 rounded-xl hover:bg-purple-600/90 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25 hover:shadow-glow-purple backdrop-blur-lg text-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Create Class</span>
            <span className="sm:hidden">Create</span>
          </button>
          
          <button
            onClick={() => openUploadModal(activeTab)}
            className="flex items-center space-x-2 bg-blue-600/80 border border-blue-500/60 text-white px-4 py-3 rounded-xl hover:bg-blue-600/90 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-blue-500/25 hover:shadow-glow-blue backdrop-blur-lg text-sm"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload Excel</span>
            <span className="sm:hidden">Upload</span>
          </button>
          
          <label className="flex items-center space-x-2 bg-green-600/80 border border-green-500/60 text-white px-4 py-3 rounded-xl hover:bg-green-600/90 transition-all duration-300 transform hover:scale-105 cursor-pointer shadow-lg shadow-green-500/25 hover:shadow-glow-green backdrop-blur-lg text-sm">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Replace All</span>
            <span className="sm:hidden">Replace</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileUpload(e, true, activeTab)}
              className="hidden"
            />
          </label>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 bg-red-600/80 border border-red-500/60 text-white px-4 py-3 rounded-xl hover:bg-red-600/90 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/25 hover:shadow-glow-red backdrop-blur-lg text-sm"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="backdrop-blur-2xl bg-gray-900/60 border border-gray-700/50 p-4 sm:p-6 rounded-2xl shadow-2xl transition-all hover:border-gray-600/70 hover:bg-gray-900/70">
          <h3 className="text-xs sm:text-sm font-medium text-gray-300 mb-2">Total Classes</h3>
          <p className="text-2xl sm:text-3xl font-bold text-white">{liveClasses.filter(cls => cls.status !== 'deleted').length}</p>
        </div>
        <div className="backdrop-blur-2xl bg-gray-900/60 border border-gray-700/50 p-4 sm:p-6 rounded-2xl shadow-2xl transition-all hover:border-red-500/30 hover:bg-gray-900/70">
          <h3 className="text-xs sm:text-sm font-medium text-gray-300 mb-2">Live Now</h3>
          <div className="flex items-center">
            <p className="text-2xl sm:text-3xl font-bold text-red-400">{live.length}</p>
            {live.length > 0 && (
              <div className="w-3 h-3 bg-red-500 rounded-full ml-2 animate-pulse shadow-lg shadow-red-500/50"></div>
            )}
          </div>
        </div>
        <div className="backdrop-blur-2xl bg-gray-900/60 border border-gray-700/50 p-4 sm:p-6 rounded-2xl shadow-2xl transition-all hover:border-blue-500/30 hover:bg-gray-900/70">
          <h3 className="text-xs sm:text-sm font-medium text-gray-300 mb-2">Scheduled</h3>
          <p className="text-2xl sm:text-3xl font-bold text-blue-400">{scheduled.length}</p>
        </div>
        <div className="backdrop-blur-2xl bg-gray-900/60 border border-gray-700/50 p-4 sm:p-6 rounded-2xl shadow-2xl transition-all hover:border-green-500/30 hover:bg-gray-900/70">
          <h3 className="text-xs sm:text-sm font-medium text-gray-300 mb-2">Completed</h3>
          <p className="text-2xl sm:text-3xl font-bold text-green-400">{completed.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="flex space-x-1 sm:space-x-2 backdrop-blur-2xl bg-gray-900/60 border border-gray-700/50 p-1 sm:p-2 rounded-2xl shadow-2xl">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-2 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-300 backdrop-blur-lg text-xs sm:text-sm ${
                  activeTab === tab.id
                    ? `${
                        tab.color === 'red' ? 'bg-red-600/80 border-red-500/60 shadow-glow-red' :
                        tab.color === 'blue' ? 'bg-blue-600/80 border-blue-500/60 shadow-glow-blue' :
                        tab.color === 'green' ? 'bg-green-600/80 border-green-500/60 shadow-glow-green' :
                        'bg-gray-600/80 border-gray-500/60 shadow-lg shadow-gray-500/25'
                      } text-white transform scale-105 border`
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/40 border border-transparent'
                }`}
              >
                {tab.id === 'live' && live.length > 0 ? (
                  <span className="w-2 h-2 sm:w-3 sm:h-3 bg-red-400 rounded-full animate-pulse"></span>
                ) : (
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
                <span className="font-semibold hidden sm:inline">{tab.label}</span>
                <span className="font-semibold sm:hidden">{tab.shortLabel}</span>
                <div className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-bold ${
                  activeTab === tab.id 
                    ? 'bg-white/20 text-white' 
                    : 'bg-gray-700/60 text-gray-300'
                }`}>
                  {tab.count}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Classes Table */}
      <div className="backdrop-blur-2xl bg-gray-900/60 border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-700/50">
          <h2 className="text-lg sm:text-xl font-semibold text-white">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Classes ({getCurrentClasses().length})
          </h2>
        </div>
        
        {loading ? (
          <SkeletonTable />
        ) : (
          <div className="overflow-x-auto">
            {getCurrentClasses().length > 0 ? (
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-800/40">
                  <tr>
                    <th className="px-3 sm:px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Class Details</th>
                    <th className="px-3 sm:px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Batch</th>
                    <th className="px-3 sm:px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Quality</th>
                    <th className="px-3 sm:px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-3 sm:px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Schedule</th>
                    <th className="px-3 sm:px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {getCurrentClasses().map((classItem) => (
                    <tr key={classItem.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gray-700/60 border border-gray-600/50 rounded-xl mr-3 sm:mr-4 flex-shrink-0 overflow-hidden backdrop-blur-lg">
                            {classItem.thumbnail ? (
                              <img src={classItem.thumbnail} alt={classItem.title} className="h-full w-full rounded-xl object-cover" />
                            ) : (
                              <div className="h-full w-full bg-gray-700/40 rounded-xl"></div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white line-clamp-2 max-w-[200px] sm:max-w-none">{classItem.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">{classItem.batchname}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">{getQualityText(classItem.defaultquality)}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-full border backdrop-blur-lg ${getStatusColor(classItem.status)}`}>
                          {classItem.status}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <div>
                          {classItem.scheduledstarttime ? (
                            <div>
                              <div className="text-xs sm:text-sm">{format(new Date(classItem.scheduledstarttime), 'MMM dd, hh:mm a')}</div>
                              {classItem.autostart && <div className="text-xs text-blue-400">Auto-start</div>}
                            </div>
                          ) : classItem.status !== 'deleted' ? (
                            <button onClick={() => openEditModal(classItem)} className="text-blue-400 hover:text-blue-300 text-xs">Set Schedule</button>
                          ) : (
                            <span className="text-gray-500 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <div className="flex space-x-2 sm:space-x-3">
                          {classItem.status === 'scheduled' && (
                            <button onClick={() => startLive(classItem.id)} className="text-green-400 hover:text-green-300 transition-colors" title="Start Live">
                              <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          )}
                          {classItem.status === 'live' && (
                            <button onClick={() => endLive(classItem.id)} className="text-red-400 hover:text-red-300 transition-colors" title="End Live">
                              <Square className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          )}
                          {classItem.status !== 'deleted' && (
                            <>
                              <button onClick={() => openEditModal(classItem)} className="text-blue-400 hover:text-blue-300 transition-colors" title="Edit">
                                <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                              <button onClick={() => deleteClass(classItem.id)} className="text-red-400 hover:text-red-300 transition-colors" title="Delete">
                                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                            </>
                          )}
                          {classItem.status === 'deleted' && (
                            <>
                              <button onClick={() => recoverClass(classItem.id)} className="text-green-400 hover:text-green-300 transition-colors" title="Recover">
                                <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                              <button onClick={() => permanentDeleteClass(classItem.id)} className="text-red-400 hover:text-red-300 transition-colors" title="Permanent Delete">
                                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <div className="backdrop-blur-2xl bg-gray-900/60 border border-gray-700/50 rounded-2xl p-6 sm:p-8 mx-4 sm:mx-6">
                  <PlusCircle className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No {activeTab} classes found</h3>
                  <p className="text-gray-300 text-sm sm:text-base">
                    {activeTab === 'deleted' 
                      ? 'No deleted classes available.' 
                      : 'Create a class or upload an Excel file to get started.'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-2xl bg-gray-900/80 border border-gray-700/60 rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl animate-fade-in-scale">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Upload to "{uploadTarget.charAt(0).toUpperCase() + uploadTarget.slice(1)}"</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-300 mb-2">Excel file should have 4 columns:</p>
              <ul className="text-sm text-gray-300 list-disc list-inside space-y-1">
                <li>Column 1: Thumbnail URL</li>
                <li>Column 2: Class Title (⚡ emoji will be auto-removed)</li>
                <li>Column 3: Batch Name (⚡ emoji will be auto-removed)</li>
                <li>Column 4: Stream Link</li>
              </ul>
              <p className="text-xs text-gray-400 mt-2">Note: Data will be imported from row 2 onwards (header row will be skipped)</p>
              <p className="text-xs text-blue-400 mt-2">Classes will be added with status "{uploadTarget}".</p>
            </div>
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              onChange={(e) => handleFileUpload(e, false, uploadTarget)} 
              className="w-full mb-4 p-3 border border-gray-600/50 rounded-xl bg-gray-800/40 text-white backdrop-blur-lg text-sm" 
            />
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => setShowUploadModal(false)} 
                className="px-4 py-2 text-gray-300 border border-gray-600/50 rounded-xl hover:bg-gray-800/40 transition-colors backdrop-blur-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Class Form Modal */}
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
