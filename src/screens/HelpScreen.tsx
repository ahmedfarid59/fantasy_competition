import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

export default function HelpScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚡ Fantasy Competition</Text>
        <Text style={styles.headerSubtitle}>Complete Game Guide</Text>
      </View>

      {/* Overview Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📖 Game Overview</Text>
        <Text style={styles.text}>
          Welcome to the Fantasy Competition! This is a strategy-based game where you build and manage a team of players competing in a general knowledge contest.
        </Text>
        <Text style={styles.text}>
          • 16 initial players to choose from{'\n'}
          • Budget constraint of 30M EGP{'\n'}
          • 6 rounds of competition{'\n'}
          • Points earned based on player performance
        </Text>
      </View>

      {/* How to Play */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎮 How to Play</Text>
        
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>1. Team Selection</Text>
          <Text style={styles.text}>
            • Navigate to "My Team" tab{'\n'}
            • Select 5 players within 30M EGP budget{'\n'}
            • Each player has different price based on skill{'\n'}
            • Confirm your selection before deadline
          </Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>2. Budget Management</Text>
          <Text style={styles.text}>
            • Round 1-3: 5 players, 30M budget{'\n'}
            • Round 4 (Quarter-Final): 3 players, 22M budget{'\n'}
            • Round 5 (Semi-Final): 2 players, unlimited budget{'\n'}
            • Round 6 (Final): 1 player, unlimited budget
          </Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>3. Transfers</Text>
          <Text style={styles.text}>
            • 1 FREE transfer per round{'\n'}
            • Additional transfers cost 30 points penalty{'\n'}
            • Swap players based on performance{'\n'}
            • Only qualified players available in later rounds
          </Text>
        </View>
      </View>

      {/* Rounds Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Rounds Schedule</Text>
        
        <View style={styles.scheduleItem}>
          <Text style={styles.roundBadge}>Round 1</Text>
          <Text style={styles.text}>Oct 31, 2025 — 8:00 PM</Text>
          <Text style={styles.textSmall}>5 players • 30M budget</Text>
        </View>

        <View style={styles.scheduleItem}>
          <Text style={styles.roundBadge}>Round 2</Text>
          <Text style={styles.text}>Nov 14, 2025 — 8:00 PM</Text>
          <Text style={styles.textSmall}>5 players • 30M budget</Text>
        </View>

        <View style={styles.scheduleItem}>
          <Text style={styles.roundBadge}>Round 3</Text>
          <Text style={styles.text}>Nov 28, 2025 — 8:00 PM</Text>
          <Text style={styles.textSmall}>5 players • 30M budget</Text>
        </View>

        <View style={styles.scheduleItem}>
          <Text style={styles.roundBadge}>Round 4</Text>
          <Text style={styles.text}>Dec 12, 2025 — 8:00 PM</Text>
          <Text style={styles.textSmall}>3 players • 22M budget • Quarter-Final</Text>
        </View>

        <View style={styles.scheduleItem}>
          <Text style={styles.roundBadge}>Round 5</Text>
          <Text style={styles.text}>Dec 19, 2025 — 8:00 PM</Text>
          <Text style={styles.textSmall}>2 players • Unlimited • Semi-Final</Text>
        </View>

        <View style={styles.scheduleItem}>
          <Text style={styles.roundBadge}>Round 6</Text>
          <Text style={styles.text}>Dec 26, 2025 — 8:00 PM</Text>
          <Text style={styles.textSmall}>1 player • Unlimited • FINAL</Text>
        </View>
      </View>

      {/* Scoring System */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 Scoring System</Text>
        <View style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Correct Answer</Text>
            <Text style={styles.scoreValue}>+5 points</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Wrong Answer</Text>
            <Text style={styles.scoreValue}>0 points</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Transfer Penalty</Text>
            <Text style={[styles.scoreValue, styles.penalty]}>-30 points</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Free Transfers</Text>
            <Text style={styles.scoreValue}>1 per round</Text>
          </View>
        </View>
        <Text style={styles.textSmall}>
          * Your total points = Sum of all your players' points minus transfer penalties
        </Text>
      </View>

      {/* Navigation Guide */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧭 Navigation Guide</Text>
        
        <View style={styles.navItem}>
          <Text style={styles.navIcon}>🏠</Text>
          <View style={styles.navText}>
            <Text style={styles.navTitle}>Home</Text>
            <Text style={styles.text}>Quick overview and round information</Text>
          </View>
        </View>

        <View style={styles.navItem}>
          <Text style={styles.navIcon}>👥</Text>
          <View style={styles.navText}>
            <Text style={styles.navTitle}>My Team</Text>
            <Text style={styles.text}>Select and manage your players</Text>
          </View>
        </View>

        <View style={styles.navItem}>
          <Text style={styles.navIcon}>🏆</Text>
          <View style={styles.navText}>
            <Text style={styles.navTitle}>Leaderboard</Text>
            <Text style={styles.text}>See rankings and standings</Text>
          </View>
        </View>

        <View style={styles.navItem}>
          <Text style={styles.navIcon}>📊</Text>
          <View style={styles.navText}>
            <Text style={styles.navTitle}>Dashboard</Text>
            <Text style={styles.text}>Track performance round by round</Text>
          </View>
        </View>

        <View style={styles.navItem}>
          <Text style={styles.navIcon}>⚙️</Text>
          <View style={styles.navText}>
            <Text style={styles.navTitle}>Settings</Text>
            <Text style={styles.text}>Configure server and view help</Text>
          </View>
        </View>

        <View style={styles.navItem}>
          <Text style={styles.navIcon}>👑</Text>
          <View style={styles.navText}>
            <Text style={styles.navTitle}>Admin (Admin Only)</Text>
            <Text style={styles.text}>Manage players and monitor users</Text>
          </View>
        </View>
      </View>

      {/* Tips & Strategy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 Tips & Strategy</Text>
        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>✓ Budget Wisely</Text>
          <Text style={styles.text}>
            Don't spend all your budget on one player. Balance between star players and reliable performers.
          </Text>
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>✓ Save Your Transfer</Text>
          <Text style={styles.text}>
            Use your free transfer strategically. Additional transfers cost 30 points!
          </Text>
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>✓ Watch Player Performance</Text>
          <Text style={styles.text}>
            Check the Dashboard to see which players are performing well and adjust your team accordingly.
          </Text>
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>✓ Plan Ahead</Text>
          <Text style={styles.text}>
            Remember that only qualified players continue to later rounds. Pick players with good consistency.
          </Text>
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>✓ Check Deadlines</Text>
          <Text style={styles.text}>
            Team selection locks at round deadline (8:00 PM). Make changes before time runs out!
          </Text>
        </View>
      </View>

      {/* Troubleshooting */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 Troubleshooting</Text>
        
        <View style={styles.troubleItem}>
          <Text style={styles.troubleTitle}>❌ Cannot connect to server</Text>
          <Text style={styles.text}>
            • Check your internet connection{'\n'}
            • Verify server URL in Settings{'\n'}
            • Make sure backend is running{'\n'}
            • Default: http://10.40.47.201:5000
          </Text>
        </View>

        <View style={styles.troubleItem}>
          <Text style={styles.troubleTitle}>❌ Players not loading</Text>
          <Text style={styles.text}>
            • Pull down to refresh the screen{'\n'}
            • Check server connection{'\n'}
            • Contact admin if issue persists
          </Text>
        </View>

        <View style={styles.troubleItem}>
          <Text style={styles.troubleTitle}>❌ Cannot save team</Text>
          <Text style={styles.text}>
            • Ensure you selected correct number of players{'\n'}
            • Check budget is not exceeded{'\n'}
            • Verify server connection{'\n'}
            • Make sure deadline hasn't passed
          </Text>
        </View>
      </View>

      {/* Admin Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👑 Admin Features</Text>
        <Text style={styles.text}>
          The first registered user automatically becomes the admin with special privileges:
        </Text>
        <View style={styles.adminFeature}>
          <Text style={styles.text}>
            ✓ <Text style={styles.bold}>Player Management:</Text> Add, edit, or remove players{'\n'}
            ✓ <Text style={styles.bold}>Connected Users:</Text> Monitor online/offline users{'\n'}
            ✓ <Text style={styles.bold}>Update Scores:</Text> Input player performance points{'\n'}
            ✓ <Text style={styles.bold}>Qualification:</Text> Mark players as qualified/disqualified
          </Text>
        </View>
      </View>

      {/* Accessibility */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>♿ Accessibility</Text>
        <Text style={styles.text}>
          This app is designed to be fully accessible with screen readers including VoiceOver (iOS), TalkBack (Android), and Commentary Screen Reader.
        </Text>
        <Text style={styles.text}>
          • All buttons have descriptive labels{'\n'}
          • Dynamic updates are announced{'\n'}
          • High contrast and large fonts supported{'\n'}
          • Clear focus states for navigation
        </Text>
      </View>

      {/* Support */}
      <View style={[styles.section, styles.lastSection]}>
        <Text style={styles.sectionTitle}>📞 Support</Text>
        <Text style={styles.text}>
          Need help? Contact the game administrator or check the settings for server information.
        </Text>
        <View style={styles.supportBox}>
          <Text style={styles.text}>
            <Text style={styles.bold}>App Version:</Text> 1.0.0{'\n'}
            <Text style={styles.bold}>Backend API:</Text> FastAPI{'\n'}
            <Text style={styles.bold}>Database:</Text> SQLite
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Good luck! 🍀</Text>
        <Text style={styles.footerText}>May the best strategist win! 🏆</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lastSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  subsection: {
    marginTop: 15,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 10,
  },
  textSmall: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 5,
  },
  bold: {
    fontWeight: '600',
    color: '#333',
  },
  scheduleItem: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  roundBadge: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  scoreCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  penalty: {
    color: '#FF3B30',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  navIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  navText: {
    flex: 1,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  tipBox: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 5,
  },
  troubleItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  troubleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 8,
  },
  adminFeature: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  supportBox: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 30,
  },
  footerText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginVertical: 3,
  },
});
