import React, { useState, useEffect } from 'react';
import SafeIcon from '../../common/SafeIcon';
import { FiX, FiSave, FiClock, FiMusic, FiCalendar } from 'react-icons/fi';
import { supabase } from '../../config/supabase';

const LessonEditModal = ({
  student,
  anchorElement,
  onClose,
  onSave,
  timeSlots,
  daysOfWeek,
  formatTimeSlot,
  saving = false
}) => {
  const [lessonDay, setLessonDay] = useState('');
  const [lessonTime, setLessonTime] = useState('');
  const [lessonType, setLessonType] = useState(null);
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'right' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (student) {
      // Pre-select the student's current lesson day and time if available
      setLessonDay(student.lesson_day || '');
      setLessonTime(student.lesson_time || '');
      fetchLessonType(student.lesson_type_id);
    }
  }, [student]);

  // Fetch the lesson type information
  const fetchLessonType = async (lessonTypeId) => {
    if (!lessonTypeId) {
      setLessonType(null);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lesson_types')
        .select('*')
        .eq('id', lessonTypeId)
        .single();
        
      if (error) throw error;
      setLessonType(data);
    } catch (error) {
      console.error('Error fetching lesson type:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (anchorElement) {
      const rect = anchorElement.getBoundingClientRect();
      const modalWidth = 300; // Slightly smaller for more compact look
      const modalHeight = 320; // Increased height for day picker
      const spacing = 12; // Space between modal and card

      // Calculate position with smart placement
      let left = rect.right + spacing;
      let top = rect.top;
      let placement = 'right';

      // Check if modal would go off right edge of screen
      if (left + modalWidth > window.innerWidth - 20) {
        // Try placing on the left
        left = rect.left - modalWidth - spacing;
        placement = 'left';

        // If still off screen, center it
        if (left < 20) {
          left = Math.max(20, (window.innerWidth - modalWidth) / 2);
          top = rect.bottom + spacing;
          placement = 'bottom';
        }
      }

      // Check if modal would go off bottom edge
      if (top + modalHeight > window.innerHeight - 20) {
        if (placement === 'bottom') {
          top = rect.top - modalHeight - spacing;
          placement = 'top';
        } else {
          top = Math.max(20, window.innerHeight - modalHeight - 20);
        }
      }

      // Ensure top is not negative
      top = Math.max(20, top);

      setPosition({ top, left, placement });
    }
  }, [anchorElement]);

  const handleSave = () => {
    if (onSave) {
      const updates = {};
      
      // Only include fields that have changed
      if (lessonDay !== student.lesson_day) {
        updates.lesson_day = lessonDay || null;
      }
      
      if (lessonTime !== student.lesson_time) {
        updates.lesson_time = lessonTime || null;
      }
      
      onSave(updates);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const getArrowStyle = () => {
    const arrowSize = 8;
    const rect = anchorElement?.getBoundingClientRect();
    if (!rect) return {};

    switch (position.placement) {
      case 'right':
        return {
          position: 'absolute',
          left: -arrowSize,
          top: Math.min(rect.height / 2, 40),
          width: 0,
          height: 0,
          borderTop: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid white`,
          filter: 'drop-shadow(-1px 0 1px rgba(0,0,0,0.1))'
        };
      case 'left':
        return {
          position: 'absolute',
          right: -arrowSize,
          top: Math.min(rect.height / 2, 40),
          width: 0,
          height: 0,
          borderTop: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid transparent`,
          borderLeft: `${arrowSize}px solid white`,
          filter: 'drop-shadow(1px 0 1px rgba(0,0,0,0.1))'
        };
      case 'bottom':
        return {
          position: 'absolute',
          top: -arrowSize,
          left: '50%',
          marginLeft: -arrowSize,
          width: 0,
          height: 0,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid white`,
          filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.1))'
        };
      case 'top':
        return {
          position: 'absolute',
          bottom: -arrowSize,
          left: '50%',
          marginLeft: -arrowSize,
          width: 0,
          height: 0,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderTop: `${arrowSize}px solid white`,
          filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))'
        };
      default:
        return {};
    }
  };

  if (!student || !anchorElement) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black bg-opacity-20" onClick={onClose} />

      {/* Modal */}
      <div
        className="fixed z-50 bg-white rounded-xl shadow-lg border border-gray-200 w-[300px]"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
        onKeyDown={handleKeyPress}
      >
        {/* Arrow pointing to card */}
        <div style={getArrowStyle()} />

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm">Edit Lesson Time</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <SafeIcon icon={FiX} className="text-gray-500 text-sm" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Student Info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
            {/* Student Name */}
            <div className="font-medium text-gray-800">{student.name}</div>

            {/* Instrument */}
            <div className="flex items-center space-x-1 text-gray-600">
              <SafeIcon icon={FiMusic} className="text-gray-400 text-xs" />
              <span className="capitalize">{student.instrument || 'No instrument set'}</span>
            </div>

            {/* Lesson Type Information - Combined Category & Name */}
            {loading ? (
              <div className="text-xs text-gray-500">Loading lesson type...</div>
            ) : lessonType ? (
              <div className="text-xs text-teal-700">
                <span className="capitalize">{lessonType.lesson_category || 'Standard'}</span>
                {' • '}
                <span>{lessonType.name}</span>
              </div>
            ) : (
              <div className="text-xs text-amber-600">No lesson type selected</div>
            )}
          </div>

          {/* Lesson Day - Added */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              <SafeIcon icon={FiCalendar} className="inline mr-1 text-gray-400" /> Lesson Day
            </label>
            <select
              value={lessonDay}
              onChange={(e) => setLessonDay(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent text-sm"
              disabled={saving}
            >
              <option value="">Select day</option>
              {daysOfWeek && daysOfWeek.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          {/* Lesson Time */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              <SafeIcon icon={FiClock} className="inline mr-1 text-gray-400" /> Lesson Time
            </label>
            <select
              value={lessonTime}
              onChange={(e) => setLessonTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent text-sm"
              disabled={saving}
            >
              <option value="">Select time</option>
              {timeSlots.map(time => (
                <option key={time} value={time}>{formatTimeSlot(time)}</option>
              ))}
            </select>

            {/* Small note about end time calculation */}
            <p className="text-xs text-gray-500 mt-1">
              End time will be automatically calculated based on lesson type duration.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-xs"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!lessonDay && !lessonTime) || (lessonDay === student.lesson_day && lessonTime === student.lesson_time)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
          >
            <SafeIcon icon={FiSave} className={saving ? 'animate-pulse' : ''} />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default LessonEditModal;