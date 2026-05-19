import { StyleSheet, Dimensions, Platform } from 'react-native';
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8
  },
  headerLeft: {
    flex: 1
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  headerSubtitle: {
    color: '#00D4FF',
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 1
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1F0D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF5033'
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#4CAF50',
    marginRight: 5
  },
  liveText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: 'bold'
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40
  },
  weatherCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E3A5F'
  },
  weatherTempRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4
  },
  weatherTemp: {
    fontSize: 52,
    fontWeight: 'bold',
    lineHeight: 58
  },
  weatherTempUnit: {
    color: '#8892A4',
    fontSize: 20,
    marginBottom: 8,
    marginLeft: 4
  },
  weatherCondition: {
    color: '#8892A4',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8
  },
  heatAdvisory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D1B00',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6
  },
  heatAdvisoryText: {
    color: '#FF9800',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  statCard: {
    width: (width - 40) / 2,
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E2A3A'
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4
  },
  statLabel: {
    color: '#8892A4',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  sectionHeader: {
    color: '#8892A4',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4
  },
  incidentCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E2A3A',
    borderLeftWidth: 4
  },
  incidentId: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#00D4FF',
    marginBottom: 4
  },
  incidentLocation: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1
  },
  voiceCard: {
    backgroundColor: '#060D1F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00D4FF',
    borderWidth: 1,
    borderColor: '#1E2A3A'
  },
  voiceCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4
  },
  voiceCardSubtitle: {
    color: '#8892A4',
    fontSize: 13
  },
  voiceTryBtn: {
    backgroundColor: '#00D4FF',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 25
  },
  voiceTryBtnText: {
    color: '#0A0E1A',
    fontWeight: 'bold',
    fontSize: 13
  },
  triggerBtn: {
    backgroundColor: '#D32F2F',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12
  },
  triggerBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    alignItems: 'center'
  },
  fabButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8
  },
  fabLabel: {
    color: '#00D4FF',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24
  },
  popupCard: {
    backgroundColor: '#1A0000',
    borderWidth: 2,
    borderColor: '#D32F2F',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center'
  },
  popupEmoji: {
    fontSize: 52,
    marginBottom: 12
  },
  popupTitle: {
    color: '#D32F2F',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 6
  },
  popupSubtitle: {
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 20,
    textAlign: 'center'
  },
  popupTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    width: '100%'
  },
  popupTipIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 1
  },
  popupTipText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    lineHeight: 20
  },
  popupCloseBtn: {
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 20,
    width: '100%',
    alignItems: 'center'
  },
  popupCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold'
  },
  weatherFeels: {
    color: '#E2E8F0',
    fontSize: 12,
    letterSpacing: 0.5,
    marginTop: 4,
    opacity: 0.85
  },
  weatherCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  weatherCardLeft: {
    flex: 1
  },
  weatherCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center'
  },
  criticalBadge: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF444433'
  },
  criticalBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  stableBadge: {
    backgroundColor: '#1E2A3A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00D4FF33'
  },
  stableBadgeText: {
    color: '#00D4FF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  simulatedSubText: {
    color: '#FF9800',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginTop: 4,
    textTransform: 'uppercase'
  },
  simulateAndVoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
    marginTop: 4
  },
  simulateContainer: {
    width: '78%',
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1E2A3A'
  },
  simulateLabel: {
    color: '#8892A4',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4
  },
  simulateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  simulateInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    padding: 8,
    backgroundColor: '#0A0E1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E2A3A'
  },
  simulateUnitText: {
    color: '#FFFFFF',
    fontSize: 15,
    marginLeft: 8,
    fontWeight: 'bold'
  },
  voiceIconContainer: {
    width: '20%',
    backgroundColor: '#111827',
    borderRadius: 14,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00D4FF33',
    elevation: 4,
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  voiceIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0A0E1A',
    borderWidth: 1.5,
    borderColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2
  },
  voiceIconLabel: {
    color: '#00D4FF',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  }
});

export default styles;
