import { StyleSheet, Dimensions } from 'react-native';
import { commonStyles } from './commonStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const mapViewStyles = StyleSheet.create({
  ...commonStyles,
  map: { ...StyleSheet.absoluteFillObject },

  creditContainer: {
    position: 'absolute',
    left: 8,
    top: 8,
    right: 8,
    alignItems: 'flex-start',
  },
  creditBubble: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 6,
    maxWidth: Math.min(340, SCREEN_WIDTH - 16),
  },
  creditText: { fontSize: 14, color: '#222', fontWeight: '600' },
  creditSmall: { fontSize: 12, color: '#444', marginTop: 2 },
  linkRow: { flexDirection: 'row', marginTop: 6, alignItems: 'center' },
  linkText: { fontSize: 13, color: '#0066cc', textDecorationLine: 'underline' },
  linkSpacer: { marginLeft: 10 },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 8,
    alignItems: 'center',
    elevation: 4,
  },
  footerText: { fontSize: 13, color: '#222' },

  markerContainer: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  markerText: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  buttonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  calloutContainer: {
    width: 140,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  calloutTitle: { fontWeight: 'bold', marginBottom: 4 },
  calloutLocation: { fontSize: 12, marginBottom: 6 },
  calloutButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
  },
  calloutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
