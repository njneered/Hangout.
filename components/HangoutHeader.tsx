import { useRouter } from 'expo-router';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const THEME = {
  bg: '#0f0a1f',
  gold: '#facc15',
  purpleDim: 'rgba(139,92,246,0.15)',
  purpleLight: '#c4b5fd',
  cardBorder: 'rgba(139,92,246,0.2)',
};

export default function HangoutHeader() {
  const router = useRouter();

  return (
    <View style={styles.header}>
      {/* Logo — taps back to home */}
      <TouchableOpacity onPress={() => router.push('/' as any)} activeOpacity={0.7}>
        <Text style={styles.logo}>⬛ Hangout.</Text>
      </TouchableOpacity>

      {/* Gear → settings */}
      <TouchableOpacity
        style={styles.gearBtn}
        onPress={() => router.push('/settings' as any)}
        activeOpacity={0.7}
      >
        <Text style={styles.gearIcon}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#0f0a1f',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,92,246,0.12)',
  },
  logo: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.gold,
    letterSpacing: -0.3,
  },
  gearBtn: {
    backgroundColor: THEME.purpleDim,
    borderRadius: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  gearIcon: { fontSize: 16 },
});
