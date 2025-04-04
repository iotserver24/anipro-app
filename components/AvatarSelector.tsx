import React, { useState } from 'react';
import { getCurrentUser } from '../services/userService';
import { updateUserAvatar } from '../services/userService';

const AvatarSelector: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAvatarSelect = async (avatar: Avatar) => {
    try {
      // Ensure we have both a valid user ID and avatar ID
      const user = getCurrentUser();
      if (!user || !user.uid) {
        console.error('[Avatar] No authenticated user found');
        // Show error toast or feedback to user
        return;
      }
      
      // Make sure we have a valid avatarId
      if (!avatar || !avatar.id) {
        console.error('[Avatar] Invalid avatar selected');
        // Show error toast or feedback to user
        return;
      }
      
      // Start loading state
      setIsUpdating(true);
      
      // Call the service method with valid parameters
      const success = await updateUserAvatar(user.uid, avatar.id);
      
      if (success) {
        // Show success message
        // Update local state if needed
      } else {
        // Show error message
      }
    } catch (error) {
      console.error('[Avatar] Error in avatar selection:', error);
      // Show error message
    } finally {
      // End loading state
      setIsUpdating(false);
    }
  };

  return (
    <div>
      {/* Render your avatar selection components here */}
    </div>
  );
};

export default AvatarSelector; 