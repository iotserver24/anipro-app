import { ImageSourcePropType } from 'react-native';
import { logger } from '../utils/logger';

export interface Avatar {
  id: string;
  name: string;
  url: string;
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

// Function to fetch avatars from remote source
export const fetchAvatars = async (): Promise<Avatar[]> => {
  try {
    logger.info('Avatars', 'Fetching avatars from API...');
    // Use the anisurge.me API endpoint to fetch avatars
    // The /list endpoint is a special case handler in the [id]/route.ts file
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
    // Keep using default avatars if fetch fails
    logger.warn('Avatars', 'Using default avatars due to fetch error');
    return DEFAULT_AVATARS;
  }
};

// Function to get a specific avatar by ID
export const getAvatarById = async (avatarId: string): Promise<string> => {
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