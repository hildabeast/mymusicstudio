import React from 'react';
import SafeIcon from '../../common/SafeIcon';
import { FiSettings, FiClock, FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import { useUser } from '../../contexts/UserContext';
import LessonTypesManager from './LessonTypesManager';

const SchoolSettingsPage = ({ onBack }) => {
  const { userIsAdmin } = useUser();

  if (!userIsAdmin) {
    return (
      <div className="p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <SafeIcon icon={FiAlertCircle} className="text-amber-500 text-2xl mb-4 mx-auto" />
          <h2 className="text-lg font-semibold text-amber-800 mb-2">Admin Access Required</h2>
          <p className="text-amber-700 mb-4">You need administrator privileges to access school settings.</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">School Settings</h1>
          <p className="text-gray-600 mt-1">Configure your school's settings and preferences</p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <SafeIcon icon={FiArrowLeft} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Lesson Types Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6 flex items-center space-x-3">
          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
            <SafeIcon icon={FiClock} className="text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Lesson Types</h2>
            <p className="text-gray-600 text-sm">Manage lesson types, durations, and pricing</p>
          </div>
        </div>
        
        <LessonTypesManager />
      </div>

      {/* School Info Section - Placeholder for future expansion */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6 flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <SafeIcon icon={FiSettings} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">General Settings</h2>
            <p className="text-gray-600 text-sm">School information and preferences</p>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center">
            <SafeIcon icon={FiAlertCircle} className="text-blue-500 mr-2" />
            <p className="text-blue-700 text-sm">
              Additional school settings will be available in a future update.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolSettingsPage;