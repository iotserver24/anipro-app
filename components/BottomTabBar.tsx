import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';

export default function BottomTabBar() {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Home',
      path: '/',
      icon: 'home',
      IconComponent: MaterialIcons
    },
    {
      name: 'Schedule',
      path: '/schedule',
      icon: 'calendar-today',
      IconComponent: MaterialIcons
    },
    // {
    //   name: 'Search',
    //   path: '/search',
    //   icon: 'search',
    //   IconComponent: MaterialIcons
    // },
    {
      name: 'My List',
      path: '/mylist',
      icon: 'bookmark',
      IconComponent: MaterialIcons
    },
    // {
    //   name: 'Continue',
    //   path: '/continue',
    //   icon: 'play-circle-outline',
    //   IconComponent: MaterialIcons
    // }
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.path}
          style={styles.tab}
          onPress={() => router.push(tab.path)}
        >
          <tab.IconComponent
            name={tab.icon}
            size={24}
            color={pathname === tab.path ? '#f4511e' : '#666'}
          />
          <Text style={[
            styles.tabText,
            pathname === tab.path && styles.activeTabText
          ]}>
            {tab.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#222',
    height: 60,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  activeTabText: {
    color: '#f4511e',
  }
}); 