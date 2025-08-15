import React, { useState } from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiHome, FiUsers, FiCalendar, FiClock, FiMenu, FiChevronLeft } from 'react-icons/fi'
import { useUser } from '../../contexts/UserContext'

const Sidebar = ({ activeSection, onSectionChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const menuItems = [
    { id: 'dashboard', icon: FiHome, label: 'Dashboard' },
    { id: 'students', icon: FiUsers, label: 'Students' },
    { id: 'timetable', icon: FiClock, label: 'Timetable' },
    { id: 'lessons', icon: FiCalendar, label: 'Lessons' },
    { id: 'calendar', icon: FiCalendar, label: 'Calendar' }, // New calendar link
  ]

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  const handleMouseEnter = () => {
    if (isCollapsed) {
      setIsHovered(true)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleSidebar()
    }
  }

  // Determine if sidebar should show expanded content
  const showExpanded = !isCollapsed || isHovered

  return (
    <nav
      className={`bg-gradient-to-b from-amber-50 to-orange-50 min-h-screen border-r border-orange-100 shadow-sm transition-all duration-300 ease-in-out ${showExpanded ? 'w-64' : 'w-20'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="p-4">
        {/* Header with Toggle Button */}
        <div className="flex items-center justify-between mb-8">
          {showExpanded && (
            <div className="flex flex-col items-center justify-center transition-opacity duration-300 w-full">
              <img
                src="https://vdjxrusqywiraonfwujq.supabase.co/storage/v1/object/public/mmsmedia/icons/MyMusicStudioLogo.png"
                alt="My Music Studio Logo"
                className="h-auto w-48 mb-2 object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  // Fallback to text if image fails to load
                  const fallbackText = document.createElement('h1');
                  fallbackText.className = "text-xl font-bold text-gray-800 whitespace-nowrap";
                  fallbackText.textContent = "Music Studio";
                  e.target.parentNode.appendChild(fallbackText);
                }}
              />
              {/* Removed the "Teacher Dashboard" text */}
            </div>
          )}
          <button
            onClick={toggleSidebar}
            onKeyDown={handleKeyDown}
            className={`p-2 rounded-xl transition-all duration-200 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 ${showExpanded ? 'ml-auto' : 'mx-auto mt-2'}`}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
            tabIndex={0}
          >
            <SafeIcon
              icon={isCollapsed ? FiMenu : FiChevronLeft}
              className="text-xl text-gray-600 hover:text-orange-600 transition-colors"
            />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center transition-all duration-200 rounded-xl group relative ${
                showExpanded ? 'px-4 py-3 space-x-3' : 'px-3 py-4 justify-center'
              } ${
                activeSection === item.id
                  ? 'bg-white shadow-md text-orange-600 border border-orange-100'
                  : 'text-gray-700 hover:bg-white/50 hover:text-orange-600'
              }`}
              aria-label={item.label}
              aria-current={activeSection === item.id ? 'page' : undefined}
            >
              <SafeIcon
                icon={item.icon}
                className={`transition-colors ${showExpanded ? 'text-xl' : 'text-2xl mx-auto'}`}
              />
              {showExpanded && (
                <span className="font-medium whitespace-nowrap overflow-hidden transition-opacity duration-300">
                  {item.label}
                </span>
              )}

              {/* Tooltip for collapsed mode */}
              {isCollapsed && !isHovered && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                  <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-800 rotate-45"></div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Collapsed state indicator */}
      {isCollapsed && !isHovered && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="w-8 h-1 bg-orange-200 rounded-full"></div>
        </div>
      )}
    </nav>
  )
}

export default Sidebar