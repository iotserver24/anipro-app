import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getAppVersion } from '../utils/appVersion';

/**
 * A component that displays the current app version information
 * 
 * @param {Object} props
 * @param {Object} props.style - Additional style for the container
 * @param {Object} props.textStyle - Additional style for the text
 * @param {boolean} props.showBuildNumber - Whether to show the build number
 * @param {string} props.prefix - Text to display before the version
 * @returns {React.Component}
 */
const AppVersionInfo = ({ 
  style, 
  textStyle, 
  showBuildNumber = true,
  prefix = 'Version'
}) => {
  const { version, buildNumber } = getAppVersion();
  
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.versionText, textStyle]}>
        {prefix} {version}
        {showBuildNumber && ` (${buildNumber})`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});

export default AppVersionInfo;

// Usage example:
// 
// import AppVersionInfo from '../components/AppVersionInfo';
// 
// const SettingsScreen = () => {
//   return (
//     <View style={{ flex: 1 }}>
//       // Other components
//       <AppVersionInfo />
//     </View>
//   );
// }; 