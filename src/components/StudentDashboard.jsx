import React, { useState, useEffect } from 'react';
import { Play, Clock, CheckCircle, Users, Calendar, ExternalLink, Radio, GraduationCap, CalendarPlus, History, Video, PlayCircle } from 'lucide-react';
import { format, isAfter, isBefore, addMinutes } from 'date-fns';
import { supabase } from '../supabaseClient';
import SkeletonCard from './SkeletonCard';
import CountdownTimer from './CountdownTimer';

const StudentDashboard = () => {
  const [liveClasses, setLiveClasses] = useState([]);
  const [activeTab, setActiveTab] = useState('live');
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadLiveClasses = React.useCallback(async () => {
    // Avoid flickering by only setting loading on initial load
    if (liveClasses.length === 0) {
      setLoading(true);
    }

    const { data: initialData, error: fetchError } = await supabase
      .from('classes')
      .select('*')
      .neq('status', 'deleted')
      .order('scheduledstarttime', { ascending: true, nullsFirst: false });

    if (fetchError) {
      console.error('Error fetching classes:', fetchError);
      setLoading(false);
      return;
    }

    const now = new Date();
    const classesToAutoStart = initialData.filter(cls =>
      cls.status === 'scheduled' &&
      cls.autostart &&
      cls.scheduledstarttime &&
      isBefore(new Date(cls.scheduledstarttime), now)
    );

    if (classesToAutoStart.length > 0) {
      const updates = classesToAutoStart.map(cls => {
        const startTime = new Date(cls.scheduledstarttime);
        return supabase
          .from('classes')
          .update({
            status: 'live',
            starttime: startTime.toISOString(),
            autoendtime: addMinutes(startTime, 105).toISOString(),
          })
          .eq('id', cls.id);
      });

      await Promise.all(updates);
      
      const { data: finalData, error: refetchError } = await supabase
        .from('classes')
        .select('*')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });
      
      if (refetchError) {
        console.error('Error re-fetching classes:', refetchError);
        setLiveClasses(initialData);
      } else {
        setLiveClasses(finalData);
      }
    } else {
      setLiveClasses(initialData);
    }

    setLoading(false);
  }, [liveClasses.length]);

  useEffect(() => {
    loadLiveClasses();
    const subscription = supabase
      .channel('public:classes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, payload => {
        loadLiveClasses();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [loadLiveClasses]);

  const cleanTitle = (title) => {
    return title ? title.replace(/⚡/g, '').trim() : '';
  };

  const categorizeClasses = () => {
    const now = new Date();
    
    const live = liveClasses.filter(cls => {
        const startTime = new Date(cls.starttime);
        const endTime = cls.autoendtime ? new Date(cls.autoendtime) : null;
        return cls.status === 'live' && isBefore(startTime, now) && (!endTime || isAfter(endTime, now));
      }).sort((a, b) => new Date(b.starttime) - new Date(a.starttime));

    const upcoming = liveClasses.filter(cls => {
        const startTime = new Date(cls.scheduledstarttime || cls.starttime);
        return isAfter(startTime, now) && cls.status === 'scheduled';
      }).sort((a, b) => new Date(a.scheduledstarttime) - new Date(b.scheduledstarttime));

    const completed = liveClasses.filter(cls => {
        const endTime = cls.endtime ? new Date(cls.endtime) : (cls.autoendtime ? new Date(cls.autoendtime) : null);
        return cls.status === 'completed' || (endTime && isBefore(endTime, now) && cls.status !== 'scheduled');
      }).sort((a, b) => new Date(b.endtime || b.autoendtime) - new Date(a.endtime || a.autoendtime));

    return { live, upcoming, completed };
  };

  const { live, upcoming, completed } = categorizeClasses();

  const handleJoinClass = (classItem) => {
    if (classItem.status === 'upcoming') return;
    setSelectedClass(classItem);
    setSelectedQuality(classItem.defaultquality);
    setShowQualityModal(true);
  };

  const getQualityOptions = () => {
    return [
      { value: 1, label: '240p', description: 'Data Saver • Low bandwidth' },
      { value: 2, label: '360p', description: 'Low Quality • Basic streaming' },
      { value: 3, label: '480p', description: 'Standard Quality • Recommended' },
      { value: 4, label: '720p', description: 'High Quality • Clear video' },
      { value: 5, label: '720p HD', description: 'HD Quality • Best experience' }
    ];
  };

  const buildVideoUrl = (quality) => {
    if (!selectedClass?.m3u8link) return '';
    
    const prefix = selectedClass.status === 'completed'
      ? 'https://edumastervideoplarerwatch.netlify.app/rec/'
      : 'https://edumastervideoplarerwatch.netlify.app/live/';
      
    const updatedM3u8 = selectedClass.m3u8link.replace(/index_\d+\.m3u8/, `index_${quality}.m3u8`);
    return `${prefix}${encodeURIComponent(updatedM3u8)}`;
  };

  const openVideoPlayer = () => {
    if (selectedQuality) {
      const videoUrl = buildVideoUrl(selectedQuality);
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
      setShowQualityModal(false);
    }
  };

  const renderClassCard = (classItem, type) => {
    const startTime = new Date(classItem.scheduledstarttime || classItem.starttime);
    
    return (
      <div key={classItem.id} className="lecture-card">
        <div className="lecture-thumbnail">
          {classItem.thumbnail ? (
            <img 
              src={classItem.thumbnail} 
              alt={cleanTitle(classItem.title)}
            />
          ) : (
             <div className="w-full h-full flex items-center justify-center text-gray-500">
                <GraduationCap size={64} />
             </div>
          )}
          {type === 'live' && (
            <div className="live-indicator">
              LIVE
            </div>
          )}
        </div>
        
        <div className="lecture-content">
          <h3 className="lecture-title mt-0 mb-4">
            {cleanTitle(classItem.title)}
          </h3>
          
          <div className="lecture-meta">
            <div className="meta-item">
              <Users className="meta-icon" />
              <span>{cleanTitle(classItem.batchname)}</span>
            </div>
            <div className="meta-item">
              <Calendar className="meta-icon" />
              <span>
                {format(startTime, 'MMM dd, yyyy • hh:mm a')}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => handleJoinClass(classItem)}
            disabled={type === 'upcoming'}
            className="watch-btn"
          >
            {type === 'live' && <><PlayCircle size={20} /><span>Watch Live</span></>}
            {type === 'completed' && <><History size={20} /><span>Watch Recording</span></>}
            {type === 'upcoming' && (
              <div className="flex items-center justify-center gap-2">
                <Clock size={20} />
                <span>Starts in</span>
                <CountdownTimer 
                  targetTime={classItem.scheduledstarttime}
                  onComplete={loadLiveClasses}
                />
              </div>
            )}
          </button>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'live', label: 'Live', icon: Radio },
    { id: 'upcoming', label: 'Upcoming', icon: Calendar },
    { id: 'completed', label: 'Completed', icon: CheckCircle }
  ];

  const noDataInfo = {
    live: {
      icon: Video,
      title: "No Live Lectures",
      message: "No live lectures are currently streaming. Check back soon for new sessions!"
    },
    upcoming: {
      icon: CalendarPlus,
      title: "No Upcoming Lectures",
      message: "No upcoming lectures are scheduled at the moment. Stay tuned for new announcements!"
    },
    completed: {
      icon: History,
      title: "No Completed Lectures",
      message: "No completed lectures available for replay. Completed sessions will appear here."
    }
  }

  const renderTabContent = (tabId) => {
    const classList = { live, upcoming, completed }[tabId];
    const info = noDataInfo[tabId];
    const Icon = info.icon;

    if (loading) {
      return (
        <div className="lectures-grid">
          {Array.from({ length: 3 }).map((_, index) => <SkeletonCard key={index} />)}
        </div>
      );
    }

    if (classList.length === 0) {
      return (
        <div className="no-data">
          <div className="no-data-icon"><Icon size={48} /></div>
          <h3>{info.title}</h3>
          <p>{info.message}</p>
        </div>
      );
    }

    return (
      <div className="lectures-grid">
        {classList.map(classItem => renderClassCard(classItem, tabId))}
      </div>
    );
  };

  return (
    <div className="container">
        <div className="tabs">
            {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                    <button 
                        key={tab.id}
                        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <Icon size={16} /> {tab.label}
                    </button>
                )
            })}
        </div>

        {tabs.map(tab => (
            <div key={tab.id} id={tab.id} className={`tab-content ${activeTab === tab.id ? 'active' : ''}`}>
                {renderTabContent(tab.id)}
            </div>
        ))}

        {showQualityModal && selectedClass && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="backdrop-blur-2xl bg-gray-900/80 border border-gray-700/60 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in-scale">
              <h2 className="text-xl font-bold text-white mb-2">Select Video Quality</h2>
              <p className="text-gray-300 mb-1">For: <span className="font-semibold text-white">{cleanTitle(selectedClass.title)}</span></p>
              <p className="text-gray-400 mb-6 text-sm">Choose the quality based on your internet connection.</p>
              
              <div className="space-y-3">
                {getQualityOptions().map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedQuality(option.value)}
                    className={`w-full p-4 text-left rounded-xl border transition-all duration-300 transform hover:scale-105 backdrop-blur-lg ${
                      selectedQuality === option.value
                        ? 'border-blue-500/60 bg-blue-600/40 shadow-glow-blue'
                        : 'border-gray-600/50 hover:border-gray-500/60 bg-gray-800/40'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-white">{option.label}</p>
                        <p className="text-sm text-gray-300">{option.description}</p>
                      </div>
                      {selectedQuality === option.value && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"></div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowQualityModal(false)}
                  className="px-4 py-2 text-gray-300 border border-gray-600/50 rounded-xl hover:bg-gray-800/40 transition-colors backdrop-blur-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={openVideoPlayer}
                  disabled={!selectedQuality}
                  className={`text-white px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center space-x-2 backdrop-blur-lg ${selectedClass.status === 'completed' ? 'bg-green-600/80 border-green-500/60 hover:bg-green-600/90 shadow-lg shadow-green-500/25 hover:shadow-glow-green' : 'bg-red-600/80 border-red-500/60 hover:bg-red-600/90 shadow-lg shadow-red-500/25 hover:shadow-glow-red'}`}
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>{selectedClass.status === 'completed' ? 'Watch Recording' : 'Watch Live'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default StudentDashboard;
