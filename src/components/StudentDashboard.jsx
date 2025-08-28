import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, CheckCircle, Users, Calendar, ExternalLink } from 'lucide-react';
import { format, isAfter, isBefore } from 'date-fns';
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
    setLoading(true);
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('scheduledstarttime', { ascending: false });

    if (error) {
      console.error('Error fetching classes:', error);
    } else {
      const now = new Date();
      const updatedClasses = data.map(cls => {
        if (cls.status === 'scheduled' && cls.autostart && cls.scheduledstarttime && isBefore(new Date(cls.scheduledstarttime), now)) {
          return { ...cls, status: 'live' };
        }
        return cls;
      });
      setLiveClasses(updatedClasses);
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
        const endTime = cls.autoendtime ? new Date(cls.autoendtime) : new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
        return isBefore(startTime, now) && isAfter(endTime, now) && cls.status === 'live';
      }),
      upcoming: liveClasses.filter(cls => {
        const startTime = new Date(cls.scheduledstarttime || cls.starttime);
        return isAfter(startTime, now) && cls.status === 'scheduled';
      }),
      completed: liveClasses.filter(cls => {
        const endTime = cls.autoendtime ? new Date(cls.autoendtime) : new Date(new Date(cls.starttime).getTime() + 2 * 60 * 60 * 1000);
        return (cls.autoendtime && isBefore(new Date(cls.autoendtime), now)) || cls.status === 'completed';
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
    
    const updatedM3u8 = classItem.m3u8link.replace(/index_\d+\.m3u8/, `index_${quality}.m3u8`);
    return `https://edumastervideoplarerwatch.netlify.app/live/${encodeURIComponent(updatedM3u8)}`;
  };

  const handleJoinClass = (classItem) => {
    if (activeTab === 'live') {
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
      <div key={classItem.id} className="backdrop-blur-xl bg-gray-900/60 border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-500 transform hover:scale-105 hover:border-gray-600/60">
        <div className="aspect-video bg-gradient-to-br from-gray-900/80 to-gray-800/80 relative overflow-hidden">
          {classItem.thumbnail ? (
            <img 
              src={classItem.thumbnail} 
              alt={cleanTitle(classItem.title)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="h-12 w-12 text-gray-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          {type === 'live' && (
            <div className="absolute top-3 left-3 backdrop-blur-lg bg-red-600/80 border border-red-500/60 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              <span className="flex items-center">
                <span className="w-2 h-2 bg-red-300 rounded-full mr-2 animate-pulse shadow-lg shadow-red-500/50"></span>
                LIVE
              </span>
            </div>
          )}
          {type === 'upcoming' && classItem.scheduledstarttime && (
            <div className="absolute top-3 left-3 backdrop-blur-lg bg-blue-600/80 border border-blue-500/60 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              <CountdownTimer targetTime={classItem.scheduledstarttime} />
            </div>
          )}
        </div>
        
        <div className="p-6">
          <h3 className="font-bold text-lg mb-3 text-white line-clamp-2">
            {cleanTitle(classItem.title)}
          </h3>
          
          <div className="flex items-center text-gray-300 mb-3">
            <Users className="h-4 w-4 mr-2" />
            <span className="text-sm">{cleanTitle(classItem.batchname)}</span>
          </div>
          
          <div className="flex items-center text-gray-300 mb-6">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="text-sm">
              {format(startTime, 'MMM dd, yyyy • hh:mm a')}
            </span>
          </div>
          
          <button
            onClick={() => handleJoinClass(classItem)}
            disabled={type === 'upcoming'}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 backdrop-blur-lg border ${
              type === 'live' 
                ? 'bg-red-600/80 border-red-500/60 text-white hover:bg-red-600/90 shadow-lg shadow-red-500/25' 
                : type === 'upcoming'
                ? 'bg-gray-700/60 border-gray-600/50 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600/80 border-blue-500/60 text-white hover:bg-blue-600/90 shadow-lg shadow-blue-500/25'
            }`}
          >
            {type === 'live' && (
              <>
                <Play className="h-4 w-4 inline mr-2" />
                Join Live
              </>
            )}
            {type === 'upcoming' && (
              <>
                <Clock className="h-4 w-4 inline mr-2" />
                Starts {format(startTime, 'hh:mm a')}
              </>
            )}
            {type === 'completed' && (
              <>
                <CheckCircle className="h-4 w-4 inline mr-2" />
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
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-center">
        <div className="flex space-x-2 mb-8 backdrop-blur-xl bg-gray-900/60 border border-gray-700/50 p-2 rounded-2xl max-w-2xl shadow-2xl">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-3 px-6 py-4 rounded-xl transition-all duration-300 flex-1 justify-center relative backdrop-blur-lg ${
                  activeTab === tab.id
                    ? `${
                        tab.color === 'red' ? 'bg-red-600/80 border-red-500/60 shadow-lg shadow-red-500/25' :
                        tab.color === 'blue' ? 'bg-blue-600/80 border-blue-500/60 shadow-lg shadow-blue-500/25' :
                        'bg-green-600/80 border-green-500/60 shadow-lg shadow-green-500/25'
                      } text-white transform scale-105 border`
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/40 border border-transparent'
                }`}
              >
                {tab.id === 'live' ? (
                  <span className={`w-3 h-3 rounded-full ${live.length > 0 ? 'bg-red-400 animate-pulse' : 'bg-gray-500'}`}></span>
                ) : (
                  <Icon className="h-5 w-5" />
                )}
                <span className="font-semibold">{tab.label}</span>
                <div className={`px-2 py-1 rounded-full text-xs font-bold ${
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)}
        </div>
      ) : getCurrentClasses().length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {getCurrentClasses().map(classItem => renderClassCard(classItem, activeTab))}
        </div>
      ) : (
        <div className="col-span-full text-center py-16">
          <div className="backdrop-blur-xl bg-gray-900/60 border border-gray-700/50 rounded-2xl p-12 shadow-2xl">
            <div className="text-gray-400 mb-6">
              {activeTab === 'live' && <Play className="h-20 w-20 mx-auto" />}
              {activeTab === 'upcoming' && <Clock className="h-20 w-20 mx-auto" />}
              {activeTab === 'completed' && <CheckCircle className="h-20 w-20 mx-auto" />}
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">
              No {activeTab} classes
            </h3>
            <p className="text-gray-300 text-lg">
              {activeTab === 'live' && 'No live classes are currently running.'}
              {activeTab === 'upcoming' && 'No classes are scheduled for the future.'}
              {activeTab === 'completed' && 'No completed classes available.'}
            </p>
          </div>
        </div>
      )}

      {/* Quality Selection Modal */}
      {showQualityModal && selectedClass && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="backdrop-blur-xl bg-gray-900/80 border border-gray-700/60 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Join Live Class</h2>
            <h3 className="text-lg text-gray-300 mb-4">{cleanTitle(selectedClass.title)}</h3>
            <p className="text-gray-300 mb-6">Choose your video quality:</p>
            
            <div className="space-y-3 mb-6">
              {getQualityOptions().map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleQualitySelect(option.value)}
                  className={`w-full p-4 text-left rounded-xl border transition-all duration-300 transform hover:scale-105 backdrop-blur-lg ${
                    selectedQuality === option.value
                      ? 'border-blue-500/60 bg-blue-600/40 shadow-lg shadow-blue-500/25'
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
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowQualityModal(false);
                  setSelectedClass(null);
                  setSelectedQuality(null);
                }}
                className="px-4 py-2 text-gray-300 border border-gray-600/50 rounded-xl hover:bg-gray-800/40 transition-colors backdrop-blur-lg"
              >
                Cancel
              </button>
              <button
                onClick={openVideoPlayer}
                disabled={!selectedQuality}
                className="bg-red-600/80 border border-red-500/60 text-white px-6 py-3 rounded-xl hover:bg-red-600/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center space-x-2 shadow-lg shadow-red-500/25 backdrop-blur-lg"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Join Live</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
