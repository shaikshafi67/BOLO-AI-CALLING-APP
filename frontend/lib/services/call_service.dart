import '../core/formatters.dart';
import '../core/mock_data.dart';
import '../models/call_history_entry.dart';

enum ConnectionStateKind { connecting, connected, reconnecting, unstable, ended }

/// Calls and rooms.
///
/// TODO: Connect WebRTC signaling server — Socket.IO on the Node backend:
///   createRoom → emit('room:create'), joinRoom → emit('room:join', code),
///   exchange SDP offer/answer + ICE candidates, then flutter_webrtc's
///   RTCPeerConnection carries video and the ORIGINAL audio.
/// TODO: Connect backend database — POST /api/calls, GET /api/calls,
///   PATCH /api/calls/:id/status (routes already exist in backend/).
class CallService {
  Future<String> createRoom() async {
    await Future.delayed(const Duration(milliseconds: 400));
    return generateRoomCode();
  }

  /// Prototype: any well-formed code "exists".
  Future<void> joinRoom(String roomCode) async {
    await Future.delayed(const Duration(milliseconds: 600));
  }

  /// Simulates the signaling handshake so the UI can show its states.
  Stream<ConnectionStateKind> connect() async* {
    yield ConnectionStateKind.connecting;
    await Future.delayed(const Duration(milliseconds: 1800));
    yield ConnectionStateKind.connected;
  }

  Future<List<CallHistoryEntry>> history() async => mockCallHistory;
}
