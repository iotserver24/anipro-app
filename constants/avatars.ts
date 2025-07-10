import { ImageSourcePropType } from 'react-native';
import { logger } from '../utils/logger';

export interface Avatar {
  id: string;
  name: string;
  url: string;
  category?: string;
  type?: 'image' | 'gif' | 'video'; // New field for media type
}

export interface PremiumAvatar extends Avatar {
  isGif: boolean;
  isVideo?: boolean; // New field for video support
  donorId?: string;
}

// Default avatars as fallback
export const DEFAULT_AVATARS: Avatar[] = [
  {
    id: 'default',
    name: 'Default',
    url: 'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_1280.png'
  },
  {
    id: 'ninja',
    name: 'Ninja',
    url: 'https://cdn-icons-png.flaticon.com/512/2410/2410387.png'
  },
  {
    id: 'samurai',
    name: 'Samurai',
    url: 'https://cdn-icons-png.flaticon.com/512/4696/4696465.png'
  },
  {
    id: 'mecha',
    name: 'Mecha',
    url: 'https://cdn-icons-png.flaticon.com/512/1154/1154468.png'
  },
  {
    id: 'kawaii',
    name: 'Kawaii',
    url: 'https://cdn-icons-png.flaticon.com/512/1785/1785210.png'
  },
  {
    id: 'sensei',
    name: 'Sensei',
    url: 'https://cdn-icons-png.flaticon.com/512/4874/4874878.png'
  }
];

// Start with default avatars
export let AVATARS: Avatar[] = [...DEFAULT_AVATARS];

// Function to check if an ID is for a premium avatar
const isPremiumAvatarId = (id: string): boolean => {
  return id.startsWith('premium_');
};

// Utility functions to detect media type from URL
export const getMediaTypeFromUrl = (url: string): 'image' | 'gif' | 'video' => {
  const urlLower = url.toLowerCase();
  
  // Check for video formats
  if (urlLower.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/)) {
    return 'video';
  }
  
  // Check for GIF format
  if (urlLower.match(/\.gif(\?.*)?$/)) {
    return 'gif';
  }
  
  // Default to image for other formats (jpg, jpeg, png, webp, etc.)
  return 'image';
};

export const isVideoUrl = (url: string): boolean => {
  return getMediaTypeFromUrl(url) === 'video';
};

export const isGifUrl = (url: string): boolean => {
  return getMediaTypeFromUrl(url) === 'gif';
};

export const isImageUrl = (url: string): boolean => {
  return getMediaTypeFromUrl(url) === 'image';
};

// Function to fetch avatars from remote source
export const fetchAvatars = async (): Promise<Avatar[]> => {
  try {
    logger.info('Avatars', 'Fetching avatars from API...');
    const response = await fetch('https://anisurge.me/api/avatars/list');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch avatars: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      // Ensure all avatar objects have proper URL format
      const validAvatars = data.filter(avatar => 
        avatar && 
        typeof avatar === 'object' && 
        avatar.id && 
        avatar.name && 
        avatar.url && 
        typeof avatar.url === 'string' && 
        avatar.url.startsWith('http')
      );
      
      if (validAvatars.length > 0) {
        AVATARS = validAvatars;
        logger.info('Avatars', `Successfully fetched ${AVATARS.length} avatars from server`);
        return validAvatars;
      } else {
        logger.warn('Avatars', 'No valid avatars in response, using defaults');
      }
    } else {
      logger.warn('Avatars', 'Empty or invalid avatar list received, using defaults');
    }
    
    return DEFAULT_AVATARS;
  } catch (error) {
    logger.error('Avatars', `Error fetching avatars: ${error}`);
    logger.warn('Avatars', 'Using default avatars due to fetch error');
    return DEFAULT_AVATARS;
  }
};

// Function to get a specific avatar by ID
export const getAvatarById = async (avatarId: string): Promise<string> => {
  logger.debug('Avatars', `Getting avatar with ID: ${avatarId}`);

  // Check if it's a premium avatar
  if (isPremiumAvatarId(avatarId)) {
    try {
      logger.info('Avatars', `Fetching premium avatar: ${avatarId}`);
      const response = await fetch('https://anisurge.me/api/avatars/premium');
      
      if (response.ok) {
        const premiumAvatars = await response.json();
        const premiumAvatar = premiumAvatars.find((a: PremiumAvatar) => a.id === avatarId);
        
        if (premiumAvatar) {
          logger.info('Avatars', `Found premium avatar: ${avatarId}`);
          return premiumAvatar.url;
        }
        
        logger.warn('Avatars', `Premium avatar ${avatarId} not found in premium list`);
      } else {
        logger.warn('Avatars', `Failed to fetch premium avatars: ${response.status}`);
      }
    } catch (error) {
      logger.error('Avatars', `Error fetching premium avatar: ${error}`);
    }
  }
  
  // If not premium or premium fetch failed, try regular avatars
  // First try to find it in the local AVATARS array
  const localAvatar = AVATARS.find(a => a.id === avatarId);
  if (localAvatar) {
    logger.debug('Avatars', `Found avatar ${avatarId} in local cache`);
    return localAvatar.url;
  }
  
  // If not found locally, try to fetch from API
  try {
    logger.info('Avatars', `Avatar ${avatarId} not found locally, fetching from API`);
    const avatars = await fetchAvatars();
    const avatar = avatars.find(a => a.id === avatarId);
    if (avatar) {
      logger.info('Avatars', `Successfully fetched avatar ${avatarId} from API`);
      return avatar.url;
    }
  } catch (error) {
    logger.warn('Avatars', `Error fetching avatar ${avatarId}: ${error}`);
  }
  
  // Default fallback
  logger.warn('Avatars', `Could not find avatar ${avatarId}, using default`);
  return DEFAULT_AVATARS[0].url;
}; 