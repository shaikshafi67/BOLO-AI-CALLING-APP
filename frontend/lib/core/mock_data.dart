import '../models/app_notification.dart';
import '../models/call_history_entry.dart';
import '../models/translation_entry.dart';
import '../models/user.dart';
import 'media.dart';

// Placeholder data for the UI prototype. Each list is replaced by a backend
// call later (see lib/services/*). Mirrors web/src/data so both apps match.

DateTime _ago({int days = 0, int hours = 0, int minutes = 0}) =>
    DateTime.now().subtract(Duration(days: days, hours: hours, minutes: minutes));

/// Contact whose "camera" plays bundled stock footage on the call screen.
const demoContactId = 'c_10';

final mockContacts = <AppUser>[
  AppUser(
    id: demoContactId,
    name: 'Marcus Bello',
    email: 'marcus.bello@example.com',
    preferredLanguage: 'en',
    presence: Presence.online,
    location: 'London, UK',
    lastCallAt: _ago(minutes: 40),
    demoVideo: Media.demoCallVideo,
    demoPoster: Media.demoCallPoster,
  ),
  AppUser(id: 'c_01', name: 'Rahul Sharma', email: 'rahul.sharma@example.com', preferredLanguage: 'hi', presence: Presence.online, location: 'Delhi, India', lastCallAt: _ago(hours: 2)),
  AppUser(id: 'c_02', name: 'Aarav Mehta', email: 'aarav.mehta@example.com', preferredLanguage: 'hi', presence: Presence.busy, location: 'Mumbai, India', lastCallAt: _ago(days: 1)),
  AppUser(id: 'c_03', name: 'Priya Reddy', email: 'priya.reddy@example.com', preferredLanguage: 'te', presence: Presence.online, location: 'Hyderabad, India', lastCallAt: _ago(days: 2)),
  AppUser(id: 'c_04', name: 'Karthik Iyer', email: 'karthik.iyer@example.com', preferredLanguage: 'ta', presence: Presence.away, location: 'Chennai, India', lastCallAt: _ago(days: 3)),
  AppUser(id: 'c_05', name: 'Emily Carter', email: 'emily.carter@example.com', preferredLanguage: 'en', presence: Presence.offline, location: 'London, UK', lastCallAt: _ago(days: 5)),
  AppUser(id: 'c_06', name: 'Ananya Das', email: 'ananya.das@example.com', preferredLanguage: 'bn', presence: Presence.online, location: 'Kolkata, India', lastCallAt: _ago(days: 8)),
  AppUser(id: 'c_07', name: 'Rohan Patil', email: 'rohan.patil@example.com', preferredLanguage: 'mr', presence: Presence.offline, location: 'Pune, India', lastCallAt: _ago(days: 12)),
  AppUser(id: 'c_08', name: 'Meera Nair', email: 'meera.nair@example.com', preferredLanguage: 'ml', presence: Presence.away, location: 'Kochi, India'),
  AppUser(id: 'c_09', name: 'Daniel Kim', email: 'daniel.kim@example.com', preferredLanguage: 'en', presence: Presence.online, location: 'Toronto, Canada', lastCallAt: _ago(days: 20)),
];

AppUser contactById(String? id) =>
    mockContacts.firstWhere((c) => c.id == id, orElse: () => mockContacts.first);

CallHistoryEntry _call(String id, String code, String contactId, String from, String to, CallDirection dir, CallOutcome outcome, DateTime at, int seconds, int lines) {
  return CallHistoryEntry(
    id: id,
    roomCode: code,
    contactId: contactId,
    participantName: contactById(contactId).name,
    direction: dir,
    outcome: outcome,
    sourceLanguage: from,
    targetLanguage: to,
    timestamp: at,
    duration: Duration(seconds: seconds),
    translatedLines: lines,
  );
}

final mockCallHistory = <CallHistoryEntry>[
  _call('call_00', 'BOLO-5307', 'c_10', 'hi', 'en', CallDirection.outgoing, CallOutcome.completed, _ago(minutes: 40), 495, 31),
  _call('call_01', 'BOLO-4829', 'c_01', 'hi', 'en', CallDirection.outgoing, CallOutcome.completed, _ago(hours: 2), 762, 48),
  _call('call_02', 'BOLO-7314', 'c_02', 'hi', 'en', CallDirection.incoming, CallOutcome.completed, _ago(days: 1, hours: 3), 872, 61),
  _call('call_03', 'BOLO-1956', 'c_03', 'te', 'en', CallDirection.outgoing, CallOutcome.completed, _ago(days: 2, hours: 1), 1325, 90),
  _call('call_04', 'BOLO-6620', 'c_04', 'ta', 'hi', CallDirection.incoming, CallOutcome.missed, _ago(days: 3, hours: 6), 0, 0),
  _call('call_05', 'BOLO-3048', 'c_05', 'en', 'hi', CallDirection.outgoing, CallOutcome.completed, _ago(days: 5), 488, 27),
  _call('call_06', 'BOLO-8812', 'c_01', 'en', 'hi', CallDirection.incoming, CallOutcome.declined, _ago(days: 6, hours: 2), 0, 0),
  _call('call_07', 'BOLO-2275', 'c_06', 'bn', 'en', CallDirection.outgoing, CallOutcome.failed, _ago(days: 8), 14, 0),
  _call('call_08', 'BOLO-5190', 'c_03', 'en', 'te', CallDirection.incoming, CallOutcome.completed, _ago(days: 10), 2104, 132),
  _call('call_09', 'BOLO-9403', 'c_07', 'mr', 'en', CallDirection.outgoing, CallOutcome.missed, _ago(days: 12), 0, 0),
  _call('call_10', 'BOLO-6751', 'c_09', 'en', 'ta', CallDirection.outgoing, CallOutcome.completed, _ago(days: 20), 655, 39),
  _call('call_11', 'BOLO-4417', 'c_04', 'ta', 'en', CallDirection.incoming, CallOutcome.completed, _ago(days: 24), 1540, 101),
];

class DashboardStat {
  final String label;
  final String value;
  final String change;
  final int trend; // 1 up, 0 flat, -1 down
  const DashboardStat(this.label, this.value, this.change, this.trend);
}

const mockStats = [
  DashboardStat('Total calls', '128', '+12 this week', 1),
  DashboardStat('Call minutes', '1,942', '+8.4% vs last week', 1),
  DashboardStat('Languages used', '5', 'Hindi most used', 0),
  DashboardStat('Translation sessions', '96', '3 fewer than last week', -1),
];

/// Call minutes per weekday (Mon → Sun) for the dashboard chart.
const mockWeeklyMinutes = [42, 68, 35, 91, 57, 24, 48];

List<AppNotification> mockNotifications() => [
      AppNotification(id: 'n_01', kind: NotificationKind.incomingCall, title: 'Incoming call', message: 'Rahul is calling you.', contactId: 'c_01', createdAt: _ago(minutes: 3)),
      AppNotification(id: 'n_02', kind: NotificationKind.callEnded, title: 'Call ended', message: 'Your call with Aarav has ended. Duration 14:32.', contactId: 'c_02', createdAt: _ago(hours: 1)),
      AppNotification(id: 'n_03', kind: NotificationKind.system, title: 'Translation service', message: 'Translation service is ready. (Demo notification: the AI backend is not connected yet.)', createdAt: _ago(hours: 5)),
      AppNotification(id: 'n_04', kind: NotificationKind.contactRequest, title: 'New contact request', message: 'Meera Nair wants to add you as a contact.', contactId: 'c_08', createdAt: _ago(days: 1), read: true),
      AppNotification(id: 'n_05', kind: NotificationKind.missedCall, title: 'Missed call', message: 'You missed a call from Karthik Iyer.', contactId: 'c_04', createdAt: _ago(days: 3), read: true),
      AppNotification(id: 'n_06', kind: NotificationKind.system, title: 'Welcome to BoloAI', message: 'Set your preferred language in Settings to personalise translations.', createdAt: _ago(days: 7), read: true),
    ];

/// Scripted Hindi ↔ English conversation for the call demo (you speak Hindi,
/// Marcus speaks English). Pre-written examples, not live AI output.
List<TranslationEntry> demoTranscript(String remoteName) => [
      TranslationEntry(id: 't1', isLocal: true, speakerName: 'You', sourceLanguage: 'hi', targetLanguage: 'en', originalText: 'Aap kaise hain?', translatedText: 'How are you?', timestamp: _ago(minutes: 4)),
      TranslationEntry(id: 't2', isLocal: false, speakerName: remoteName, sourceLanguage: 'en', targetLanguage: 'hi', originalText: "I'm doing great.", translatedText: 'Main bahut accha hoon.', timestamp: _ago(minutes: 3)),
      TranslationEntry(id: 't3', isLocal: true, speakerName: 'You', sourceLanguage: 'hi', targetLanguage: 'en', originalText: 'Kya aap project ka demo dekh sakte hain?', translatedText: 'Can you see the project demo?', timestamp: _ago(minutes: 2)),
      TranslationEntry(id: 't4', isLocal: false, speakerName: remoteName, sourceLanguage: 'en', targetLanguage: 'hi', originalText: 'Yes, and the captions are really clear.', translatedText: 'Haan, aur captions bahut saaf hain.', timestamp: _ago(minutes: 1)),
    ];

/// Lines played one at a time during a call to show "translating…" → "ready".
const demoQueue = [
  (local: false, en: 'How was your day?', hi: 'Aapka din kaisa raha?'),
  (local: true, en: 'Busy, but good. Thanks for asking!', hi: 'Vyast tha, lekin accha. Poochne ke liye shukriya!'),
  (local: false, en: "Let's talk again tomorrow.", hi: 'Chaliye kal phir baat karte hain.'),
];
