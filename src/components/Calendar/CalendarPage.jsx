import React, { useState, useEffect } from 'react';
import SafeIcon from '../../common/SafeIcon';
import { FiCalendar, FiExternalLink, FiLoader } from 'react-icons/fi';
import { supabase } from '../../config/supabase';

const CalendarPage = () => {
  const [iframeUrl, setIframeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Set up the calendar iframe URL with authentication
    const setupCalendarUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get the current auth session to extract the token
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
          throw new Error('No authentication token found. Please sign in again.');
        }

        // Determine base URL based on current domain
        let baseUrl;
        const host = window.location.hostname;

        if (host.includes('mymusicstudio.app')) {
          baseUrl = 'https://calendar.mymusicstudio.app';
        } else if (host.includes('netlify.app')) {
          baseUrl = 'https://magical-sunburst-348c14.netlify.app';
        } else {
          // Default for local development or other environments
          baseUrl = 'https://magical-sunburst-348c14.netlify.app';
        }

        // Construct the full URL with the auth token
        const url = `${baseUrl}?token=${token}`;
        console.log('📅 Calendar iframe URL set (token hidden for security)');
        setIframeUrl(url);
      } catch (error) {
        console.error('Error setting up calendar URL:', error);
        setError(error.message || 'Failed to set up calendar view');
      } finally {
        setLoading(false);
      }
    };

    setupCalendarUrl();
  }, []);

  // Function to open the calendar in a new tab
  const openInNewTab = () => {
    if (iframeUrl) {
      window.open(iframeUrl, '_blank');
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Calendar</h1>
          <p className="text-gray-600 mt-1">View and manage your schedule in calendar format</p>
        </div>
        {iframeUrl && (
          <button 
            onClick={openInNewTab}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <SafeIcon icon={FiExternalLink} />
            <span>Open in New Tab</span>
          </button>
        )}
      </div>

      {/* Calendar Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <SafeIcon icon={FiCalendar} className="text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Lesson Calendar</h2>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="w-full h-[calc(100vh-300px)] min-h-[500px] flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-center">
              <SafeIcon icon={FiLoader} className="animate-spin text-blue-500 text-3xl mx-auto mb-3" />
              <p className="text-gray-600">Loading calendar...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="w-full h-[calc(100vh-300px)] min-h-[500px] flex items-center justify-center bg-red-50 border border-red-200 rounded-lg">
            <div className="text-center max-w-md p-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <SafeIcon icon={FiCalendar} className="text-red-500 text-2xl" />
              </div>
              <h3 className="text-xl font-semibold text-red-700 mb-2">Calendar Error</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Calendar iframe */}
        {!loading && !error && iframeUrl && (
          <div className="w-full h-[calc(100vh-300px)] min-h-[500px] border border-gray-200 rounded-lg overflow-hidden">
            <iframe 
              src={iframeUrl}
              title="My Music Studio Calendar"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="auto"
              className="w-full h-full"
            ></iframe>
          </div>
        )}
      </div>
      
      {/* Help text */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center space-x-2">
          <SafeIcon icon={FiCalendar} className="text-blue-500" />
          <p className="text-blue-800 text-sm">
            This calendar shows all your scheduled lessons and events. You can filter, search, and view events by day, week, or month.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;