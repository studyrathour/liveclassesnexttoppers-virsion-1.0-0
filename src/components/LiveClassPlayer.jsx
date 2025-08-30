import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Users, ExternalLink, Play, Video } from 'lucide-react';
import { supabase } from '../supabaseClient';

const LiveClassPlayer = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState(null);
  const [showQualityModal, setShowQualityModal] = useState(true);

  useEffect(() => {
    loadClassData();
  }, [classId]);

  const loadClassData = async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', parseInt(classId))
      .single();

    if (error || !data) {
      console.error('Error fetching class data:', error);
    } else {
      setClassData(data);
      setSelectedQuality(data.defaultquality);
    }
  };

  const cleanTitle = (title) => {
    return title ? title.replace(/⚡/g, '').trim() : '';
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
    if (!classData?.m3u8link) return '';
    
    const prefix = classData.status === 'completed'
      ? 'https://edumastervideoplarerwatch.netlify.app/rec/'
      : 'https://edumastervideoplarerwatch.netlify.app/live/';
      
    const updatedM3u8 = classData.m3u8link.replace(/index_\d+\.m3u8/, `index_${quality}.m3u8`);
    return `${prefix}${encodeURIComponent(updatedM3u8)}`;
  };

  const handleQualitySelect = (quality) => {
    setSelectedQuality(quality);
setShowQualityModal(false);
  };

  const openVideoPlayer = () => {
    if (selectedQuality) {
      const videoUrl = buildVideoUrl(selectedQuality);
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!classData) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12 px-4">
        <div className="backdrop-blur-xl bg-white/[.05] border border-white/[.1] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-2">Loading Class...</h2>
          <p className="text-gray-300 mb-4">If the class does not load, it may not exist.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600/80 border border-blue-500/60 text-white px-6 py-3 rounded-xl hover:bg-blue-600/90 transition-all transform hover:scale-105 backdrop-blur-lg hover:shadow-glow-blue"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-gray-300 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>
        
        <div className="flex flex-col md:flex-row md:justify-between md:items-start space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-white mb-3">{cleanTitle(classData.title)}</h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-300">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{cleanTitle(classData.batchname)}</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-lg ${
                classData.status === 'live' 
                  ? 'bg-red-600/80 border-red-500/60 text-white shadow-lg shadow-red-500/25' 
                  : 'bg-green-600/80 border-green-500/60 text-white'
              }`}>
                {classData.status === 'live' && (
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-red-300 rounded-full mr-2 animate-pulse shadow-lg shadow-red-500/50"></span>
                    LIVE
                  </span>
                )}
                {classData.status === 'completed' && (
                  <span className="flex items-center">
                    <Video className="w-3 h-3 mr-1.5"/>
                    RECORDING
                  </span>
                )}
                {classData.status !== 'live' && classData.status !== 'completed' && classData.status}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => setShowQualityModal(true)}
            className="flex items-center space-x-2 backdrop-blur-xl bg-white/[.05] border border-white/[.1] text-gray-300 px-4 py-3 rounded-xl hover:bg-white/[.1] transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Quality: {getQualityOptions().find(q => q.value === selectedQuality)?.label}</span>
          </button>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-white/[.05] border border-white/[.1] rounded-2xl overflow-hidden mb-6 shadow-2xl">
        <div className="aspect-video flex items-center justify-center">
          <div className="text-center p-8">
            <div className={`w-32 h-32 bg-gradient-to-br ${classData.status === 'completed' ? 'from-green-600/60 to-blue-600/60' : 'from-blue-600/60 to-red-600/60'} border border-white/[.1] rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl backdrop-blur-xl`}>
              {classData.status === 'completed' ? <Video className="h-16 w-16 text-white" /> : <Play className="h-16 w-16 text-white ml-2" />}
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">{classData.status === 'completed' ? 'Recording Available' : 'Ready to Watch'}</h2>
            <p className="text-gray-300 mb-6 max-w-md mx-auto">
              Click the button below to open the player in a new tab. 
              Selected quality: <span className="text-blue-400 font-semibold">
                {getQualityOptions().find(q => q.value === selectedQuality)?.label}
              </span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={openVideoPlayer}
                disabled={!selectedQuality}
                className={`flex items-center space-x-2 px-8 py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 backdrop-blur-lg ${classData.status === 'completed' ? 'bg-green-600/80 border-green-500/60 text-white hover:bg-green-600/90 shadow-lg shadow-green-500/25 hover:shadow-glow-green' : 'bg-red-600/80 border-red-500/60 text-white hover:bg-red-600/90 shadow-lg shadow-red-500/25 hover:shadow-glow-red'}`}
              >
                <ExternalLink className="h-5 w-5" />
                <span>{classData.status === 'completed' ? 'Open Recording' : 'Open Video Player'}</span>
              </button>
              
              <button
                onClick={() => setShowQualityModal(true)}
                className="flex items-center space-x-2 backdrop-blur-xl bg-white/[.05] border border-white/[.1] text-gray-300 px-6 py-4 rounded-xl hover:bg-white/[.1] transition-colors"
              >
                <Settings className="h-5 w-5" />
                <span>Change Quality</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-white/[.05] border border-white/[.1] rounded-2xl shadow-2xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Class Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-300 mb-1">Batch</h3>
              <p className="text-white">{cleanTitle(classData.batchname)}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-300 mb-1">Status</h3>
              <p className="text-white capitalize">{classData.status}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-300 mb-1">Video Quality</h3>
              <p className="text-white">
                {getQualityOptions().find(q => q.value === selectedQuality)?.label} - {getQualityOptions().find(q => q.value === selectedQuality)?.description}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-300 mb-1">Start Time</h3>
              <p className="text-white">
                {new Date(classData.starttime).toLocaleString()}
              </p>
            </div>
            {classData.endtime && (
              <div>
                <h3 className="font-medium text-gray-300 mb-1">End Time</h3>
                <p className="text-white">
                  {new Date(classData.endtime).toLocaleString()}
                </p>
              </div>
            )}
            <div>
              <h3 className="font-medium text-gray-300 mb-1">Stream Link</h3>
              <p className="text-gray-300 text-sm font-mono truncate">
                {classData.m3u8link}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showQualityModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-2xl bg-slate-900/[.85] border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in-scale">
            <h2 className="text-xl font-bold text-white mb-4">Select Video Quality</h2>
            <p className="text-gray-300 mb-6">Choose the video quality based on your internet connection:</p>
            
            <div className="space-y-3">
              {getQualityOptions().map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleQualitySelect(option.value)}
                  className={`w-full p-4 text-left rounded-xl border transition-all duration-300 transform hover:scale-105 backdrop-blur-lg ${
                    selectedQuality === option.value
                      ? 'border-blue-500/60 bg-blue-600/40 shadow-glow-blue'
                      : 'border-slate-600 hover:border-slate-500 bg-slate-800/40'
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
                className="px-4 py-2 text-gray-300 border border-slate-600 rounded-xl hover:bg-slate-800/40 transition-colors backdrop-blur-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowQualityModal(false);
                  openVideoPlayer();
                }}
                disabled={!selectedQuality}
                className={`text-white px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center space-x-2 backdrop-blur-lg ${classData.status === 'completed' ? 'bg-green-600/80 border-green-500/60 hover:bg-green-600/90 shadow-lg shadow-green-500/25 hover:shadow-glow-green' : 'bg-blue-600/80 border-blue-500/60 hover:bg-blue-600/90 shadow-lg shadow-blue-500/25 hover:shadow-glow-blue'}`}
              >
                <ExternalLink className="h-4 w-4" />
                <span>{classData.status === 'completed' ? 'Watch Recording' : 'Watch Live'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveClassPlayer;
