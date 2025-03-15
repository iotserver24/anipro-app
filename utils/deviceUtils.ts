import * as Device from 'expo-device';
import { logger } from '../utils/logger';

/**
 * Gets the appropriate key to use for download URLs based on device architecture
 * @param simulatedArch Optional parameter to simulate a specific architecture (for testing)
 * @returns The key to use for download URLs (arm64-v8a, x86_64, x86, or universal)
 */
export function getDeviceArchitectureUrlKey(simulatedArch: string | null = null): string {
  try {
    // If simulating an architecture, use that instead of the device's actual architecture
    if (simulatedArch) {
      logger.debug(`Using simulated architecture: ${simulatedArch}`);
      
      // Map the simulated architecture to a URL key
      if (simulatedArch.toLowerCase() === 'arm64') {
        return 'arm64-v8a';
      } else if (simulatedArch.toLowerCase() === 'x86_64') {
        return 'x86_64';
      } else if (simulatedArch.toLowerCase() === 'x86') {
        return 'x86';
      }
      
      // If the simulated architecture doesn't match any known keys, use universal
      return 'universal';
    }
    
    const supportedArchs = Device.supportedCpuArchitectures || [];
    logger.debug('Device supported CPU architectures:', supportedArchs);
    
    // Get the primary architecture (first in the list)
    const primaryArch = supportedArchs.length > 0 ? supportedArchs[0] : null;
    logger.debug('Primary device architecture detected:', primaryArch);
    
    // Map the Expo Device API architecture values to our download URL keys
    if (primaryArch) {
      let urlKey = 'universal'; // Default
      
      // Direct match for arm64-v8a
      if (primaryArch === 'arm64-v8a') {
        urlKey = 'arm64-v8a';
      }
      // For other architectures, check if they contain the key strings
      else if (primaryArch.toLowerCase() === 'arm64') {
        urlKey = 'arm64-v8a';
      } else if (primaryArch.toLowerCase() === 'x86_64') {
        urlKey = 'x86_64';
      } else if (primaryArch.toLowerCase() === 'x86') {
        urlKey = 'x86';
      }
      
      logger.debug(`Mapped architecture ${primaryArch} to URL key: ${urlKey}`);
      return urlKey;
    }
    
    logger.debug('No architecture detected, defaulting to universal');
    return 'universal';
  } catch (error) {
    logger.error('Error detecting device architecture:', error);
    return 'universal';
  }
}

/**
 * Gets the appropriate download URL for the device's architecture
 * @param downloadUrls Object containing download URLs for different architectures
 * @param simulatedArch Optional parameter to simulate a specific architecture (for testing)
 * @returns The URL for the appropriate architecture, falling back to universal if needed
 */
export function getArchitectureSpecificDownloadUrl(
  downloadUrls: Record<string, string>,
  simulatedArch: string | null = null
): string {
  try {
    const archKey = getDeviceArchitectureUrlKey(simulatedArch);
    logger.debug(`Looking for download URL with key: ${archKey}`);
    
    // Log all available download URLs for debugging
    logger.debug('Available download URLs:', Object.keys(downloadUrls));
    
    // Check if we have a URL for the specific architecture
    if (downloadUrls[archKey] && downloadUrls[archKey].trim() !== '') {
      logger.debug(`Found architecture-specific download URL for ${archKey}`);
      return downloadUrls[archKey];
    }
    
    // Special case: if archKey is arm64-v8a but only arm64 is available
    if (archKey === 'arm64-v8a' && downloadUrls['arm64'] && downloadUrls['arm64'].trim() !== '') {
      logger.debug(`Using arm64 URL for arm64-v8a architecture`);
      return downloadUrls['arm64'];
    }
    
    // Fall back to universal if specific architecture URL is not available
    logger.debug(`No specific URL for ${archKey}, using universal URL`);
    return downloadUrls.universal;
  } catch (error) {
    logger.error('Error getting architecture-specific download URL:', error);
    return downloadUrls.universal;
  }
}