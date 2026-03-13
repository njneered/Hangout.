import { CURRENT_USER, FRIENDS, NUDGE } from '@/constants/mockData';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0d0d18'},
  content: {padding: 24, paddingTop: 60},

  //header
  header: {marginBottom: 28},
  appName: {fontSize: 26, fontWeight: '800', color: '#ffc84a', marginBottom: 6},
  greeting: {fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2},
  date: { fontSize: 13, color: '#555'},

  //nudge card
  nudgeCard: {
    backgroundColor: '#1a1530',
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,200,74,0.2)',
  },
  nudgeLabel:{fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom:4},
  nudgeDays: {fontSize:36, fontWeight:'800', color: '#ffc84a'},
  nudgeActivity: {fontSize: 16, color: '#fff', marginBottom: 20},
  planBtn:{
    backgroundColor: '#ffc84a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  planBtnText:{color: '#1a1530', fontWeight: '700', fontSize: 14},

  //hangouts list
  sectionLabel:{
    fontSize: 11, fontWeight :'700', letterSpacing: 2,
    color: 'rgba(255,255,255,0.3)', marginBottom: 12,
  },
  friendRow:{
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },

  friendInfo:{flex: 1},
  friendName: {fontSize: 14, fontWeight: '600', color: '#fff'},
  friendActivity: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2},
  badge: {borderRadius: 10, padding: 8, alignItems: 'center', minWidth: 52},
  badgeSoon: {backgroundColor: 'rgba(255,200,74,0.12)'},
  badgeOverdue: {backgroundColor: 'rgba(255,80,80,0.12)'},
  badgeNum: {fontSize: 16, fontWeight:'800', color:'#fff'},
  badgeLabel: {fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1},
});

function getGreeting(){
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}



export default function HomeScreen(){
  const router = useRouter();
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  return (
    <ScrollView style = {styles.container} contentContainerStyle={styles.content}>

      {/*HEADER*/}
      <View style = {styles.header}>
        <View>
          <Text style={styles.appName}>Hangout.</Text>
          <Text style={styles.greeting}>Good {getGreeting()}, {CURRENT_USER.name}!</Text>
          <Text style ={styles.date}>{today}</Text>
        </View>
      </View>

      {/*NUDGE CARD*/}
      <View style={styles.nudgeCard}>
        <Text style={styles.nudgeLabel}>It's been a while...</Text>
        <Text style={styles.nudgeDays}>{NUDGE.lastHangout} days since</Text>
        <Text style={styles.nudgeActivity}>hanging with {NUDGE.name}</Text>
        <TouchableOpacity style={styles.planBtn} onPress={() => router.push('/schedule' as any)}>
          <Text style={styles.planBtnText}>Plan something</Text>
        </TouchableOpacity>
      </View>

      {/*RECENT HANGOUTS LIST*/}
      <Text style={styles.sectionLabel}>RECENT HANGOUTS</Text>
      {FRIENDS.map((friend: typeof FRIENDS[0]) => (
        <View key={friend.id} style={styles.friendRow}>
          <View style={styles.friendInfo}>
            <Text style={styles.friendName}>{friend.name}</Text>
            <Text style={styles.friendActivity}>{friend.activity}</Text>
          </View>
          <View style={[styles.badge, friend.overdue ? styles.badgeOverdue : styles.badgeSoon]}>
            <Text style={styles.badgeNum}>{friend.lastHangout}</Text>
            <Text style={styles.badgeLabel}>{friend.overdue ? 'overdue' : 'days ago'}</Text>
          </View>
        </View>
      ))}

    </ScrollView>
  );
}