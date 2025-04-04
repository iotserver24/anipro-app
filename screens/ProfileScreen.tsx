import { useNavigation } from '@react-navigation/native';
import DonationStats from '../components/DonationStats';

const navigation = useNavigation();

const handleDonatePress = () => {
  navigation.navigate('Donate');
};

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#fff',
  },
});

const fetchAvatarUrl = async (avatarId: string) => {
  setAvatarLoading(true);
  try {
    const cleanId = avatarId.trim(); // Remove any whitespace
    console.log('Fetching avatar with ID:', cleanId);
    
    // First try to get from premium avatars
    const premiumResponse = await fetch('https://anisurge.me/api/avatars/premium');
    if (premiumResponse.ok) {
      const premiumAvatars = await premiumResponse.json();
      console.log('Premium avatars:', premiumAvatars.map((a: any) => a.id));
      
      // Make sure we're comparing the exact ID
      const premiumAvatar = premiumAvatars.find((a: any) => a.id === cleanId);
      if (premiumAvatar) {
        console.log('Found premium avatar:', {
          id: premiumAvatar.id,
          name: premiumAvatar.name,
          url: premiumAvatar.url
        });
        setAvatarUrl(premiumAvatar.url);
        setAvatarLoading(false);
        return;
      } else {
        console.log('Available premium avatar IDs:', premiumAvatars.map((a: any) => a.id));
        console.log('Premium avatar not found in list:', cleanId);
      }
    } else {
      console.warn('Failed to fetch premium avatars:', premiumResponse.status);
    }

    // If not found in premium, try regular avatars
    console.log('Trying regular avatars API');
    const response = await fetch(`https://anisurge.me/api/avatars/${cleanId}`);
    if (response.ok) {
      const avatar = await response.json();
      console.log('Found regular avatar:', {
        id: avatar.id,
        name: avatar.name,
        url: avatar.url
      });
      setAvatarUrl(avatar.url);
    } else {
      console.warn('Avatar not found in regular list, using default');
      setAvatarUrl(AVATARS[0].url);
    }
  } catch (error) {
    console.warn('Error fetching avatar:', error);
    // Fallback to default
    setAvatarUrl(AVATARS[0].url);
  } finally {
    setAvatarLoading(false);
  }
};

const ProfileScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {/* ... existing header content ... */}
      </View>
      
      <DonationStats />
      
      <View style={styles.menuSection}>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: '#f4511e' }]}
          onPress={handleDonatePress}
        >
          <View style={styles.menuItemContent}>
            <Icon name="heart" size={24} color="#fff" />
            <Text style={[styles.menuItemText, { color: '#fff' }]}>Support AniSurge</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#fff" />
        </TouchableOpacity>
        
        {/* ... rest of your menu items ... */}
      </View>
    </ScrollView>
  );
};

export default ProfileScreen; 