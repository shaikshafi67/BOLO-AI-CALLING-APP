import '../models/call_history_entry.dart';
import '../models/user.dart';

/// Placeholder data for UI development. Replaced by real backend calls in
/// Phase 4 (backend/API integration) — never used once that lands.
const mockCurrentUser = AppUser(
  id: 'u1',
  name: 'Shafi',
  email: 'shaikshafi6288@gmail.com',
  preferredLanguage: 'en',
);

const mockContacts = [
  AppUser(id: 'u2', name: 'Aditi Rao', email: 'aditi@example.com', preferredLanguage: 'hi'),
  AppUser(id: 'u3', name: 'Karthik Reddy', email: 'karthik@example.com', preferredLanguage: 'te'),
  AppUser(id: 'u4', name: 'Meera Nair', email: 'meera@example.com', preferredLanguage: 'ta'),
  AppUser(id: 'u5', name: 'John Mathew', email: 'john@example.com', preferredLanguage: 'en'),
];

final mockCallHistory = [
  CallHistoryEntry(
    id: 'c1',
    participantName: 'Aditi Rao',
    direction: CallDirection.outgoing,
    timestamp: DateTime.now().subtract(const Duration(hours: 2)),
    duration: const Duration(minutes: 4, seconds: 32),
  ),
  CallHistoryEntry(
    id: 'c2',
    participantName: 'Karthik Reddy',
    direction: CallDirection.incoming,
    timestamp: DateTime.now().subtract(const Duration(days: 1)),
    duration: const Duration(minutes: 12, seconds: 5),
  ),
  CallHistoryEntry(
    id: 'c3',
    participantName: 'Meera Nair',
    direction: CallDirection.missed,
    timestamp: DateTime.now().subtract(const Duration(days: 2)),
    duration: Duration.zero,
  ),
];
