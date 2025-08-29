import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, CheckCircle, Users, Calendar, ExternalLink, Settings, Video } from 'lucide-react';
import { format, isAfter, isBefore, addMinutes } from 'date-fns';
import CountdownTimer from './CountdownTimer';
import { supabase } from '../supabaseClient';
import SkeletonCard from './SkeletonCard';

const StudentDashboard = () => {
  const [liveClasses, setLiveClasses] = useState([]);
  const [activeTab, setActiveTab] = useState('live');
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
  }, []);

  const loadLiveClasses = async () => {
    if (!loading) setLoading(true);

    const { data: initialData, error: fetchError } = await supabase
      .from('classes')
      .select('*')
      .neq('status', 'deleted')
      .order('scheduledstarttime', { ascending: false });

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
      
      // Re-fetch after updates to get the latest state
      const { data: finalData, error: refetchError } = await supabase
        .from('classes')
        .select('*')
        .neq('status', 'deleted')
        .order('scheduledstarttime', { ascending: false });
      
      if (refetchError) {
        console.error('Error re-fetching classes:', refetchError);
        setLiveClasses(initialData); // Fallback to initial data on refetch error
      } else {
        setLiveClasses(finalData);
      }
    } else {
      setLiveClasses(initialData);
    }

    setLoading(false);
  };

  const cleanTitle = (title) => {
    return title ? title.replace(/⚡/g, '').trim() : '';
  };

  const categorizeClasses = () => {
    const now = new Date();
    
    return {
      live: liveClasses.filter(cls => {
        const startTime = new Date(cls.starttime);
        const endTime = cls.autoendtime ? new Date(cls.autoendtime) : null;
        return cls.status === 'live' && isBefore(startTime, now) && (!endTime || isAfter(endTime, now));
      }),
      upcoming: liveClasses.filter(cls => {
        const startTime = new Date(cls.scheduledstarttime || cls.starttime);
        return isAfter(startTime, now) && cls.status === 'scheduled';
      }),
      completed: liveClasses.filter(cls => {
        const endTime = cls.endtime ? new Date(cls.endtime) : (cls.autoendtime ? new Date(cls.autoendtime) : null);
        return cls.status === 'completed' || (endTime && isBefore(endTime, now) && cls.status !== 'scheduled');
      })
    };
  };

  const { live, upcoming, completed } = categorizeClasses();

  const getQualityOptions = () => {
    return [
      { value: 1, label: '240p', description: 'Data Saver • Low bandwidth' },
      { value: 2, label: '360p', description: 'Low Quality • Basic streaming' },
      { value: 3, label: '480p', description: 'Standard Quality • Recommended' },
      { value: 4, label: '720p', description: 'High Quality • Clear video' },
      { value: 5, label: '720p HD', description: 'HD Quality • Best experience' }
    ];
  };

  const buildVideoUrl = (classItem, quality) => {
    if (!classItem?.m3u8link) return '';
    
    const prefix = classItem.status === 'completed'
      ? 'https://edumastervideoplarerwatch.netlify.app/rec/'
      : 'https://edumastervideoplarerwatch.netlify.app/live/';
      
    const updatedM3u8 = classItem.m3u8link.replace(/index_\d+\.m3u8/, `index_${quality}.m3u8`);
    return `${prefix}${encodeURIComponent(updatedM3u8)}`;
  };

  const handleJoinClass = (classItem) => {
    if (activeTab === 'live' || activeTab === 'completed') {
      setSelectedClass(classItem);
      setSelectedQuality(classItem.defaultquality);
      setShowQualityModal(true);
    } else {
      navigate(`/live/${classItem.id}`);
    }
  };

  const handleQualitySelect = (quality) => {
    setSelectedQuality(quality);
  };

  const openVideoPlayer = () => {
    if (selectedClass && selectedQuality) {
      const videoUrl = buildVideoUrl(selectedClass, selectedQuality);
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
      setShowQualityModal(false);
      setSelectedClass(null);
      setSelectedQuality(null);
    }
  };

  const renderClassCard = (classItem, type) => {
    const startTime = new Date(classItem.scheduledstarttime || classItem.starttime);
    
    return (
      <div key={classItem.id} className="backdrop-blur-2xl bg-gray-900/60 border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 transform hover:scale-[1.03] hover:border-blue-500/50">
        <div className="aspect-video bg-gradient-to-br from-gray-900/80 to-gray-800/80 relative overflow-hidden">
          {classItem.thumbnail ? (
            <img 
              src={classItem.thumbnail} 
              alt={cleanTitle(classItem.title)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {type === 'live' && <Play className="h-12 w-12 text-gray-400" />}
              {type === 'completed' && <Video className="h-12 w-12 text-gray-400" />}
              {type === 'upcoming' && <Clock className="h-12 w-12 text-gray-400" />}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          {type === 'live' && (
            <div className="absolute top-3 left-3 backdrop-blur-lg bg-red-600/80 border border-red-500/60 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium shadow-lg">
              <span className="flex items-center">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-300 rounded-full mr-1.5 sm:mr-2 animate-pulse shadow-lg shadow-red-500/50"></span>
                LIVE
              </span>
            </div>
          )}
          {type === 'upcoming' && classItem.scheduledstarttime && (
            <div className="absolute top-3 left-3 backdrop-blur-lg bg-blue-600/80 border border-blue-500/60 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium shadow-lg">
              <CountdownTimer targetTime={classItem.scheduledstarttime} />
            </div>
          )}
        </div>
        
        <div className="p-4 sm:p-6">
          <h3 className="font-bold text-base sm:text-lg mb-3 text-white line-clamp-2">
            {cleanTitle(classItem.title)}
          </h3>
          
          <div className="flex items-center text-gray-300 mb-3">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            <span className="text-xs sm:text-sm">{cleanTitle(classItem.batchname)}</span>
          </div>
          
          <div className="flex items-center text-gray-300 mb-4 sm:mb-6">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            <span className="text-xs sm:text-sm">
              {format(startTime, 'MMM dd, yyyy • hh:mm a')}
            </span>
          </div>
          
          <button
            onClick={() => handleJoinClass(classItem)}
            disabled={type === 'upcoming'}
            className={`w-full py-2.5 sm:py-3 px-4 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 backdrop-blur-lg border text-sm sm:text-base ${
              type === 'live' 
                ? 'bg-red-600/80 border-red-500/60 text-white hover:bg-red-600/90 shadow-lg shadow-red-500/25 hover:shadow-glow-red' 
                : type === 'upcoming'
                ? 'bg-gray-700/60 border-gray-600/50 text-gray-400 cursor-not-allowed'
                : 'bg-green-600/80 border-green-500/60 text-white hover:bg-green-600/90 shadow-lg shadow-green-500/25 hover:shadow-glow-green'
            }`}
          >
            {type === 'live' && (
              <>
                <Play className="h-3 w-3 sm:h-4 sm:w-4 inline mr-2" />
                Join Live
              </>
            )}
            {type === 'upcoming' && (
              <>
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 inline mr-2" />
                Starts {format(startTime, 'hh:mm a')}
              </>
            )}
            {type === 'completed' && (
              <>
                <Video className="h-3 w-3 sm:h-4 sm:w-4 inline mr-2" />
                Watch Recording
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'live', label: 'Live Now', count: live.length, icon: Play, color: 'red' },
    { id: 'upcoming', label: 'Upcoming', count: upcoming.length, icon: Clock, color: 'blue' },
    { id: 'completed', label: 'Completed', count: completed.length, icon: CheckCircle, color: 'green' }
  ];

  const getCurrentClasses = () => {
    switch (activeTab) {
      case 'live': return live;
      case 'upcoming': return upcoming;
      case 'completed': return completed;
      default: return [];
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-8">
      {/* Tabs */}
      <div className="flex justify-center">
        <div className="flex space-x-1 sm:space-x-2 mb-8 backdrop-blur-2xl bg-gray-900/60 border border-gray-700/50 p-1 sm:p-2 rounded-2xl w-full max-w-2xl shadow-2xl">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 sm:space-x-3 px-3 sm:px-6 py-3 sm:py-4 rounded-xl transition-all duration-300 flex-1 justify-center relative backdrop-blur-lg text-sm sm:text-base ${
                  activeTab === tab.id
                    ? `${
                        tab.color === 'red' ? 'bg-red-600/80 border-red-500/60 shadow-glow-red' :
                        tab.color === 'blue' ? 'bg-blue-600/80 border-blue-500/60 shadow-glow-blue' :
                        'bg-green-600/80 border-green-500/60 shadow-glow-green'
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
                <span className="font-semibold sm:hidden">
                  {tab.id === 'live' ? 'Live' : tab.id === 'upcoming' ? 'Soon' : 'Done'}
                </span>
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

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
          {Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)}
        </div>
      ) : getCurrentClasses().length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
          {getCurrentClasses().map(classItem => renderClassCard(classItem, activeTab))}
        </div>
      ) : (
        <div className="col-span-full text-center py-12 sm:py-16">
          <div className="backdrop-blur-2xl bg-gray-900/60 border border-gray-700/50 rounded-2xl p-8 sm:p-12 shadow-2xl mx-4">
            <div className="text-gray-400 mb-6">
              {activeTab === 'live' && <Play className="h-16 w-16 sm:h-20 sm:w-20 mx-auto" />}
              {activeTab === 'upcoming' && <Clock className="h-16 w-16 sm:h-20 sm:w-20 mx-auto" />}
              {activeTab === 'completed' && <CheckCircle className="h-16 w-16 sm:h-20 sm:w-20 mx-auto" />}
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">
              No {activeTab} classes
            </h3>
            <p className="text-gray-300 text-base sm:text-lg">
              {activeTab === 'live' && 'No live classes are currently running.'}
              {activeTab === 'upcoming' && 'No classes are scheduled for the future.'}
              {activeTab === 'completed' && 'No completed classes available.'}
            </p>
          </div>
        </div>
      )}

      {/* Quality Selection Modal */}
      {showQualityModal && selectedClass && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-2xl bg-gray-900/80 border border-gray-700/60 rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl animate-fade-in-scale">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">Join Class</h2>
            <h3 className="text-base sm:text-lg text-gray-300 mb-4 line-clamp-2">{cleanTitle(selectedClass.title)}</h3>
            <p className="text-gray-300 mb-6 text-sm sm:text-base">Choose your video quality:</p>
            
            <div className="space-y-3 mb-6">
              {getQualityOptions().map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleQualitySelect(option.value)}
                  className={`w-full p-3 sm:p-4 text-left rounded-xl border transition-all duration-300 transform hover:scale-105 backdrop-blur-lg ${
                    selectedQuality === option.value
                      ? 'border-blue-500/60 bg-blue-600/40 shadow-glow-blue'
                      : 'border-gray-600/50 hover:border-gray-500/60 bg-gray-800/40'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-white text-sm sm:text-base">{option.label}</p>
                      <p className="text-xs sm:text-sm text-gray-300">{option.description}</p>
                    </div>
                    {selectedQuality === option.value && (
                      <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => {
                  setShowQualityModal(false);
                  setSelectedClass(null);
                  setSelectedQuality(null);
                }}
                className="px-4 py-2 text-gray-300 border border-gray-600/50 rounded-xl hover:bg-gray-800/40 transition-colors backdrop-blur-lg text-sm order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                onClick={openVideoPlayer}
                disabled={!selectedQuality}
                className={`text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center space-x-2 backdrop-blur-lg text-sm order-1 sm:order-2 ${selectedClass.status === 'completed' ? 'bg-green-600/80 border-green-500/60 hover:bg-green-600/90 shadow-lg shadow-green-500/25 hover:shadow-glow-green' : 'bg-red-600/80 border-red-500/60 hover:bg-red-600/90 shadow-lg shadow-red-500/25 hover:shadow-glow-red'}`}
              >
                <ExternalLink className="h-4 w-4" />
                <span>{selectedClass.status === 'completed' ? 'Watch Recording' : 'Join Live'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
