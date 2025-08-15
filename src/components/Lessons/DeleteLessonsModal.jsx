import React from 'react';
import SafeIcon from '../../common/SafeIcon';
import { FiTrash2, FiX, FiAlertTriangle } from 'react-icons/fi';

const DeleteLessonsModal = ({ selectedLessons, lessonCount, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <SafeIcon icon={FiTrash2} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Delete Lessons</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <SafeIcon icon={FiX} className="text-gray-500" />
          </button>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-red-600 mb-4">
            <SafeIcon icon={FiAlertTriangle} className="text-red-500" />
            <span className="font-semibold">Warning: This action cannot be undone!</span>
          </div>
          
          <p className="text-gray-700">
            You're about to delete <span className="font-semibold">{lessonCount}</span> lesson{lessonCount !== 1 ? 's' : ''}.
            This will permanently remove {lessonCount !== 1 ? 'these lessons' : 'this lesson'} from your records.
          </p>
          
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              All associated lesson notes and attendance records will also be deleted.
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-colors shadow-sm"
          >
            Delete {lessonCount} Lesson{lessonCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteLessonsModal;