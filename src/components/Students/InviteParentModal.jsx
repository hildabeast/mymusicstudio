import React, { useState } from 'react';
import SafeIcon from '../../common/SafeIcon';
import { FiX, FiMail, FiClock, FiAlertCircle, FiCheck, FiLoader, FiRefreshCw } from 'react-icons/fi';
import { supabase } from '../../config/supabase';

const InviteParentModal = ({ parent, onClose, onSuccess }) => {
  const [email, setEmail] = useState(parent.email || '');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [isResend, setIsResend] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Call the RPC function to create an invitation
      const { data, error } = await supabase.rpc(
        'create_parent_invite',
        {
          parent_id: parent.id,
          email: email.trim(),
          expires_in_days: parseInt(expiresInDays) || 7
        }
      );
      
      if (error) throw error;
      
      // Generate the invitation URL
      const inviteUrl = `${getParentPortalBaseUrl()}/#/invite?token=${data.token}`;
      setInviteUrl(inviteUrl);
      
      // Check if this is a resend of an existing invitation
      setIsResend(data.resend || false);
      
      // Show success message
      setSuccess(true);
      
      // Notify parent component of success
      if (onSuccess) {
        onSuccess({ 
          parentId: parent.id,
          email: email,
          inviteUrl: inviteUrl,
          expiresAt: data.expires_at,
          isResend: data.resend
        });
      }
      
    } catch (error) {
      console.error('Error creating parent invitation:', error);
      setError(error.message || 'Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };
  
  const getParentPortalBaseUrl = () => {
    const origin = window.location.origin;
    
    if (origin.includes("netlify")) {
      return "https://effortless-gingersnap-d61d86.netlify.app";
    }
    
    if (origin.includes("mymusicstudio.app")) {
      return "https://parent.mymusicstudio.app";
    }
    
    return "http://localhost:3001"; // local/dev
  };
  
  const copyInviteUrl = () => {
    navigator.clipboard.writeText(inviteUrl);
    // Show temporary "copied" feedback
    const copyButton = document.getElementById('copy-button');
    if (copyButton) {
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 2000);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <SafeIcon icon={FiMail} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              {success ? 'Invitation Created' : 'Invite Parent to Portal'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            disabled={loading}
          >
            <SafeIcon icon={FiX} className="text-gray-500" />
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <div className="flex items-center">
              <SafeIcon icon={FiAlertCircle} className="text-red-500 mr-2 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}
        
        {success ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <div className="flex items-center">
                <SafeIcon icon={FiCheck} className="text-green-500 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-green-700 font-medium">
                    {isResend 
                      ? "Existing invitation found — link regenerated!" 
                      : "Invitation created successfully!"}
                  </p>
                  <p className="text-green-600 text-sm">
                    {isResend 
                      ? `The invitation for ${parent.first_name} ${parent.last_name} has been refreshed with a new link.`
                      : `An invitation has been created for ${parent.first_name} ${parent.last_name}`}
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invitation Link
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-gray-50"
                />
                <button
                  id="copy-button"
                  onClick={copyInviteUrl}
                  className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Share this link with the parent or send them an email
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start space-x-2">
                <SafeIcon icon={FiClock} className="text-blue-500 mt-0.5" />
                <div>
                  <p className="text-blue-700 font-medium">Next Steps</p>
                  <p className="text-blue-600 text-sm">
                    The parent will need to click this link and create an account to access the portal.
                    This invitation link will expire in {expiresInDays} days.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Name
              </label>
              <input
                type="text"
                value={`${parent.first_name || ''} ${parent.last_name || ''}`}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
                disabled
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="parent@example.com"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                An invitation will be sent to this email address
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invitation Expires In (Days)
              </label>
              <input
                type="number"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                min="1"
                max="30"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start space-x-2">
                <SafeIcon icon={FiAlertCircle} className="text-blue-500 mt-0.5" />
                <div>
                  <p className="text-blue-700 font-medium">Important</p>
                  <p className="text-blue-600 text-sm">
                    After creating the invitation, you'll need to share the invitation link with the parent.
                    They will need to create an account to access the portal.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <SafeIcon icon={FiLoader} className="animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <SafeIcon icon={FiMail} />
                    <span>Create Invitation</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InviteParentModal;