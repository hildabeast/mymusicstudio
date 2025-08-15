import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../config/supabase'

const UserContext = createContext()

// Create a session storage key for saving user context
const USER_CONTEXT_STORAGE_KEY = 'mms_user_context'

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null) // Auth user
  const [currentUserID, setCurrentUserID] = useState(null) // Internal user ID
  const [currentSchoolID, setCurrentSchoolID] = useState(null) // School ID
  const [userIsAdmin, setUserIsAdmin] = useState(false) // Admin status
  const [loading, setLoading] = useState(true)
  const [needsSchoolSelection, setNeedsSchoolSelection] = useState(false)
  const [availableSchools, setAvailableSchools] = useState([])
  const [debugInfo, setDebugInfo] = useState(null)
  
  // Track whether context was loaded from session storage
  const [contextRestoredFromStorage, setContextRestoredFromStorage] = useState(false)

  // Load persisted context from sessionStorage on initial load
  useEffect(() => {
    try {
      const savedContext = sessionStorage.getItem(USER_CONTEXT_STORAGE_KEY)
      if (savedContext) {
        const parsedContext = JSON.parse(savedContext)
        console.log('📋 Loading saved context from session storage:', parsedContext)
        
        // Restore context values if they exist
        if (parsedContext.currentUserID) setCurrentUserID(parsedContext.currentUserID)
        if (parsedContext.currentSchoolID) setCurrentSchoolID(parsedContext.currentSchoolID)
        if (parsedContext.userIsAdmin !== undefined) setUserIsAdmin(parsedContext.userIsAdmin)
        if (parsedContext.availableSchools) setAvailableSchools(parsedContext.availableSchools)
        
        // Important: Also restore the needsSchoolSelection value
        if (parsedContext.needsSchoolSelection !== undefined) {
          setNeedsSchoolSelection(parsedContext.needsSchoolSelection)
        }
        
        // Mark that we've restored from storage
        setContextRestoredFromStorage(true)
        
        // We'll still check the auth state, but this gives us initial values
      }
    } catch (error) {
      console.error('Error loading persisted context:', error)
      // If there's an error loading the context, we'll just proceed with normal auth flow
    }
  }, [])

  // Persist context to sessionStorage whenever important values change
  useEffect(() => {
    // Only save once we have meaningful data
    if (currentUserID && currentSchoolID) {
      try {
        const contextToSave = {
          currentUserID,
          currentSchoolID,
          userIsAdmin,
          needsSchoolSelection,
          availableSchools,
        }
        console.log('💾 Saving context to session storage:', contextToSave)
        sessionStorage.setItem(USER_CONTEXT_STORAGE_KEY, JSON.stringify(contextToSave))
      } catch (error) {
        console.error('Error persisting context:', error)
      }
    }
  }, [currentUserID, currentSchoolID, userIsAdmin, needsSchoolSelection, availableSchools])

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 Initial session check:', session?.user?.id || 'No session')
      if (session?.user) {
        setUser(session.user)
        
        // If we already have user context from sessionStorage and it's properly restored,
        // skip refetching the data completely
        if (contextRestoredFromStorage && currentUserID && currentSchoolID) {
          console.log('✅ Using existing context from session storage, skipping fetch')
          setLoading(false)
        } else {
          handleUserLogin(session.user)
        }
      } else {
        // Clear context if no active session
        resetUserContext()
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔄 Auth state change:', _event, session?.user?.id || 'No user')
      if (session?.user) {
        setUser(session.user)
        
        // Only refetch user data on sign_in event or if context is missing
        // or if needsSchoolSelection is true (important for multi-school users)
        if (_event === 'SIGNED_IN' || 
            !currentUserID || 
            !currentSchoolID ||
            (!contextRestoredFromStorage && needsSchoolSelection)) {
          handleUserLogin(session.user)
        } else {
          console.log('✅ Auth state changed but using existing context')
          setLoading(false)
        }
      } else {
        // Clear everything on sign out
        resetUserContext()
        // Also clear sessionStorage
        sessionStorage.removeItem(USER_CONTEXT_STORAGE_KEY)
      }
    })

    return () => subscription.unsubscribe()
  }, [currentUserID, currentSchoolID, contextRestoredFromStorage, needsSchoolSelection])

  const resetUserContext = () => {
    console.log('🔄 Resetting user context')
    setUser(null)
    setCurrentUserID(null)
    setCurrentSchoolID(null)
    setUserIsAdmin(false)
    setNeedsSchoolSelection(false)
    setAvailableSchools([])
    setDebugInfo(null)
    setContextRestoredFromStorage(false)
    setLoading(false)
  }

  const handleUserLogin = async (authUser) => {
    try {
      setLoading(true)
      console.log('🚀 Starting user login flow for auth user:', authUser.id)

      // Step 1: Query users table with CORRECT join syntax
      console.log('📊 Querying users table with corrected join...')
      const { data: userRecords, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          auth_user_id,
          name,
          email,
          role,
          school_id,
          is_admin,
          school:school_id (
            id,
            name
          )
        `)
        .eq('auth_user_id', authUser.id)
        .eq('role', 'teacher')

      console.log('📊 User records query result:', {
        userRecords,
        userError,
        recordCount: userRecords?.length || 0
      })

      // Create debug info
      const debug = {
        authUserId: authUser.id,
        authUserEmail: authUser.email,
        queryResult: userRecords,
        queryError: userError,
        recordCount: userRecords?.length || 0,
        timestamp: new Date().toISOString()
      }
      setDebugInfo(debug)

      if (userError) {
        console.error('❌ Error fetching user records:', userError)
        throw new Error(`Database query failed: ${userError.message}`)
      }

      if (!userRecords || userRecords.length === 0) {
        console.error('❌ No teacher records found for auth user:', authUser.id)
        console.log('🔍 Available auth user data:', {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at
        })

        // Let's also check what users exist in the database
        const { data: allUsers, error: allUsersError } = await supabase
          .from('users')
          .select('id, auth_user_id, email, role')
          .eq('role', 'teacher')

        console.log('🔍 All teacher users in database:', allUsers)
        console.log('🔍 All users query error:', allUsersError)

        throw new Error(`No teacher account found for this user. Auth ID: ${authUser.id}`)
      }

      // Step 2: Determine school selection
      console.log(`🏫 Processing ${userRecords.length} school(s)...`)

      if (userRecords.length === 1) {
        // Only one school - automatically select it
        const userRecord = userRecords[0]
        console.log('✅ Single school found, auto-selecting:', {
          userRecordId: userRecord.id,
          schoolId: userRecord.school_id,
          schoolName: userRecord.school?.name,
          isAdmin: userRecord.is_admin
        })

        setCurrentUserID(userRecord.id)
        setCurrentSchoolID(userRecord.school_id)
        setUserIsAdmin(userRecord.is_admin || false)
        setNeedsSchoolSelection(false)
        setContextRestoredFromStorage(true)
        setLoading(false)
      } else {
        // Multiple schools - show selection ONLY if not already selected
        console.log('🏫 Multiple schools found, checking if already selected...')
        const schoolsData = userRecords.map(record => ({
          schoolId: record.school_id,
          schoolName: record.school?.name || `School ${record.school_id}`,
          userRecordId: record.id,
          isAdmin: record.is_admin || false
        }))
        console.log('🏫 Available schools:', schoolsData)
        
        // Check if we already have a valid school selected from session storage
        if (contextRestoredFromStorage && 
            currentSchoolID && 
            schoolsData.some(school => school.schoolId === currentSchoolID)) {
          console.log('🏫 Using previously selected school from session storage:', currentSchoolID)
          setAvailableSchools(schoolsData)
          setNeedsSchoolSelection(false)
        } else {
          console.log('🏫 No valid school selection found, showing selector')
          setAvailableSchools(schoolsData)
          setNeedsSchoolSelection(true)
        }
        setLoading(false)
      }
    } catch (error) {
      console.error('❌ Login flow error:', error)
      setLoading(false)
      // Don't reset everything on error - keep the debug info
    }
  }

  const selectSchool = (schoolId) => {
    console.log('🏫 School selected:', schoolId)
    const selectedSchool = availableSchools.find(school => school.schoolId === schoolId)
    console.log('🏫 Selected school data:', selectedSchool)

    if (selectedSchool) {
      setCurrentUserID(selectedSchool.userRecordId)
      setCurrentSchoolID(selectedSchool.schoolId)
      setUserIsAdmin(selectedSchool.isAdmin)
      setNeedsSchoolSelection(false)
      setContextRestoredFromStorage(true)
      console.log('✅ School context set:', {
        userRecordId: selectedSchool.userRecordId,
        schoolId: selectedSchool.schoolId,
        isAdmin: selectedSchool.isAdmin
      })
      
      // Save the selection to sessionStorage
      try {
        const contextToSave = {
          currentUserID: selectedSchool.userRecordId,
          currentSchoolID: selectedSchool.schoolId,
          userIsAdmin: selectedSchool.isAdmin,
          needsSchoolSelection: false,
          availableSchools
        }
        sessionStorage.setItem(USER_CONTEXT_STORAGE_KEY, JSON.stringify(contextToSave))
      } catch (error) {
        console.error('Error saving school selection:', error)
      }
    } else {
      console.error('❌ Selected school not found in available schools')
    }
  }

  const signOut = async () => {
    console.log('👋 Signing out...')
    // Clear session storage before sign out
    sessionStorage.removeItem(USER_CONTEXT_STORAGE_KEY)
    await supabase.auth.signOut()
    resetUserContext()
  }

  const value = {
    // Auth state
    user,
    loading,
    
    // Context state
    currentUserID,
    currentSchoolID,
    userIsAdmin,
    
    // School selection
    needsSchoolSelection,
    availableSchools,
    selectSchool,
    
    // Actions
    signOut,
    
    // Debug info
    debugInfo
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}