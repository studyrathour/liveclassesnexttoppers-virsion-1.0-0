import React, { useState, useEffect } from 'react';
import { Play, Clock, CheckCircle, Users, Calendar, ExternalLink, Radio, GraduationCap, CalendarPlus, History, PlayCircle, Video } from 'lucide-react';
import { format } from 'date-fns';
import SkeletonCard from './SkeletonCard';
import Header from './Header';

const StudentDashboard = () => {
  const [apiClasses, setApiClasses] = useState({ live: [], upcoming: [], completed: [] });
  const [activeTab, setActiveTab] = useState('live');
  const [loading, setLoading] = useState(true);

  const mapApiDataToClass = (apiItem, status) => {
    const id = apiItem.link; 
    let m3u8Link = '';
    try {
      const url = new URL(apiItem.link);
      m3u8Link = url.searchParams.get('url') || '';
    } catch (e) {
      console.error("Invalid link format in API data:", apiItem.link);
    }

    return {
      id: id,
      thumbnail: apiItem.image,
      title: apiItem.title,
      batchname: apiItem.batch,
      streamlink: apiItem.link,
      m3u8link: m3u8Link,
      status: status,
      starttime: new Date().toISOString(),
      scheduledstarttime: null,
      endtime: status === 'completed' ? new Date().toISOString() : null,
    };
  };

  const loadApiClasses = React.useCallback(async () => {
    setLoading(true);
    try {
      const [liveRes, upcomingRes, completedRes] = await Promise.all([
        fetch('https://api.rolexcoderz.live/?get=live'),
        fetch('https://api.rolexcoderz.live/?get=up'),
        fetch('https://api.rolexcoderz.live/?get=completed')
      ]);

      const liveData = await liveRes.json();
      const upcomingData = await upcomingRes.json();
      const completedData = await completedRes.json();

      setApiClasses({
        live: (liveData?.data || []).map(item => mapApiDataToClass(item, 'live')),
        upcoming: (upcomingData?.data || []).map(item => mapApiDataToClass(item, 'upcoming')),
        completed: (completedData?.data || []).map(item => mapApiDataToClass(item, 'completed')),
      });

    } catch (error) {
      console.error("Failed to fetch API classes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApiClasses();
    const interval = setInterval(loadApiClasses, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, [loadApiClasses]);

  const cleanTitle = (title) => {
    return title ? title.replace(/⚡/g, '').trim() : '';
  };

  const buildVideoUrl = (classItem) => {
    if (!classItem?.m3u8link) return '';
    
    const prefix = classItem.status === 'completed'
      ? 'https://edumastervideoplarerwatch.netlify.app/rec/'
      : 'https://edumastervideoplarerwatch.netlify.app/live/';
      
    return `${prefix}${encodeURIComponent(classItem.m3u8link)}`;
  };

  const handleJoinClass = (classItem) => {
    if (classItem.status === 'upcoming') return;
    const videoUrl = buildVideoUrl(classItem);
    if (videoUrl) {
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const renderClassCard = (classItem, type) => {
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
                {format(new Date(), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => handleJoinClass(classItem)}
            disabled={type === 'upcoming'}
            className={`watch-btn ${type === 'live' ? 'btn-live' : type === 'completed' ? 'btn-completed' : ''}`}
          >
            {type === 'live' && <><PlayCircle size={20} /><span>Watch Live</span></>}
            {type === 'completed' && <><History size={20} /><span>Watch Recording</span></>}
            {type === 'upcoming' && (
              <div className="flex items-center justify-center gap-2">
                <Clock size={20} />
                <span>Upcoming</span>
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
    const classList = apiClasses[tabId];
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
        <Header />
        <div className="tabs">
            {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                    <button 
                        key={tab.id}
                        className={`tab tab-${tab.id} ${activeTab === tab.id ? 'active' : ''}`}
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
    </div>
  );
};

export default StudentDashboard;
