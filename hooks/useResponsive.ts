import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

export interface ResponsiveDimensions {
  width: number;
  height: number;
  isLandscape: boolean;
  isTablet: boolean;
  isSmallScreen: boolean;
  isLargeScreen: boolean;
}

export const useResponsive = (): ResponsiveDimensions => {
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return {
      width,
      height,
      isLandscape: width > height,
      isTablet: Math.min(width, height) >= 600,
      isSmallScreen: Math.min(width, height) < 400,
      isLargeScreen: Math.min(width, height) >= 800,
    };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const { width, height } = window;
      setDimensions({
        width,
        height,
        isLandscape: width > height,
        isTablet: Math.min(width, height) >= 600,
        isSmallScreen: Math.min(width, height) < 400,
        isLargeScreen: Math.min(width, height) >= 800,
      });
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
};
