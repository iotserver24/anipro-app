import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';

export default function BottomNav() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  return (
    <View style={[styles.navBar, { paddingBottom: insets.bottom, backgroundColor: theme.colors.surface }]}>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => router.push('/')}
      >
        <Ionicons 
          name="home" 
          size={24} 
          color={pathname === '/' ? theme.colors.primary : theme.colors.textSecondary} 
        />
        <Text style={[
          styles.navText, 
          { color: pathname === '/' ? theme.colors.primary : theme.colors.textSecondary }
        ]}>
          Home
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => router.push('/schedule')}
      >
        <Ionicons 
          name="calendar" 
          size={24} 
          color={pathname === '/schedule' ? theme.colors.primary : theme.colors.textSecondary} 
        />
        <Text style={[
          styles.navText,
          { color: pathname === '/schedule' ? theme.colors.primary : theme.colors.textSecondary }
        ]}>
          Schedule
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => router.push('/mylist')}
      >
        <Ionicons 
          name="bookmark" 
          size={24} 
          color={pathname === '/mylist' ? theme.colors.primary : theme.colors.textSecondary} 
        />
        <Text style={[
          styles.navText,
          { color: pathname === '/mylist' ? theme.colors.primary : theme.colors.textSecondary }
        ]}>
          My List
        </Text>
      </TouchableOpacity>
      {/* Commenting out continue option for now
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => router.push('/continue')}
      >
        <Ionicons 
          name="play-circle" 
          size={24} 
          color={pathname === '/continue' ? theme.colors.primary : theme.colors.textSecondary} 
        />
        <Text style={[
          styles.navText,
          { color: pathname === '/continue' ? theme.colors.primary : theme.colors.textSecondary }
        ]}>
          Continue
        </Text>
      </TouchableOpacity>
      */}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  navText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
}); 