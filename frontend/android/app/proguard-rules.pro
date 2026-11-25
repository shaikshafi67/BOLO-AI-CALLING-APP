# MainActivity taps the call's microphone through flutter_webrtc's
# LocalAudioTrack and WebRTC's AudioTrackSink: keep them intact in release builds.
-keep class org.webrtc.** { *; }
-keep class com.cloudwebrtc.webrtc.** { *; }
