import * as Device from 'expo-device';
import { logger } from '../utils/logger';

/**
 * Gets the appropriate key to use for download URLs based on device architecture
 * @param simulatedArch Optional parameter to simulate a specific architecture (for testing)
 * @returns The key to use for download URLs (arm64-v8a, x86_64, x86, or universal)
 */
export function getDeviceArchitectureUrlKey(simulatedArch?: string | null): string {
  // If a simulated architecture is provided, use that
  if (simulatedArch) {
    return simulatedArch;
  }

  // Get the device's CPU architecture
  const arch = Device.supportedCpuArchitectures?.[0] || 'unknown';

  // Map device architectures to download URL keys
  switch (arch.toLowerCase()) {
    case 'arm64':
    case 'arm64-v8a':
      return 'arm64';
    case 'armeabi-v7a':
    case 'armeabi':
      return 'universal'; // Use universal for older ARM architectures
    case 'x86_64':
      return 'x86_64';
    case 'x86':
      return 'x86';
    default:
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
  downloadUrls: {
    universal: string;
    'arm64'?: string;
    'x86_64'?: string;
    'x86'?: string;
  },
  simulatedArch?: string | null
): string {
  const urlKey = getDeviceArchitectureUrlKey(simulatedArch);
  
  // First try to get the architecture-specific URL
  const specificUrl = downloadUrls[urlKey as keyof typeof downloadUrls];
  if (specificUrl) {
    return specificUrl;
  }

  // Fallback to universal if specific architecture URL is not available
  return downloadUrls.universal;
}