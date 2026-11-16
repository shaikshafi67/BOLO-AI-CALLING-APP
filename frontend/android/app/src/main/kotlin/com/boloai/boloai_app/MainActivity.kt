package com.boloai.boloai_app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import com.cloudwebrtc.webrtc.FlutterWebRTCPlugin
import com.cloudwebrtc.webrtc.audio.LocalAudioTrack
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel
import org.webrtc.AudioTrackSink
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

/// Native helpers for live translation in calls (see lib/services/web_media_stub.dart):
///  - "boloai/mic" streams the call's microphone as 16 kHz mono PCM, tapped
///    from the WebRTC track so the call and translation share one microphone.
///  - "boloai/audio" plays a translated sentence (MP3).
/// It also creates the "calls" notification channel used by incoming-call pushes.
class MainActivity : FlutterActivity() {
    private val main = Handler(Looper.getMainLooper())
    private var micSink: Pcm16kSink? = null
    private var micTrack: LocalAudioTrack? = null
    private var pcmEvents: EventChannel.EventSink? = null
    private val players = mutableSetOf<MediaPlayer>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createCallsChannel()
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        val messenger = flutterEngine.dartExecutor.binaryMessenger

        EventChannel(messenger, "boloai/mic").setStreamHandler(object : EventChannel.StreamHandler {
            override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
                pcmEvents = events
            }

            override fun onCancel(arguments: Any?) {
                pcmEvents = null
            }
        })

        MethodChannel(messenger, "boloai/audio").setMethodCallHandler { call, result ->
            when (call.method) {
                "startMic" -> {
                    val trackId = call.argument<String>("trackId")
                    val track = trackId?.let { FlutterWebRTCPlugin.sharedSingleton?.getLocalTrack(it) } as? LocalAudioTrack
                    if (track == null) {
                        result.error("no_track", "Microphone track $trackId not found", null)
                    } else {
                        stopMic()
                        val sink = Pcm16kSink { chunk -> main.post { pcmEvents?.success(chunk) } }
                        track.addSink(sink)
                        micTrack = track
                        micSink = sink
                        result.success(null)
                    }
                }
                "stopMic" -> {
                    stopMic()
                    result.success(null)
                }
                "playMp3" -> {
                    val bytes = call.argument<ByteArray>("bytes")
                    if (bytes == null) result.success(null) else playMp3(bytes) { result.success(null) }
                }
                "stopPlayback" -> {
                    stopPlayback()
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }
    }

    override fun onDestroy() {
        stopMic()
        stopPlayback()
        super.onDestroy()
    }

    private fun stopMic() {
        micSink?.let { micTrack?.removeSink(it) }
        micSink = null
        micTrack = null
    }

    /// Plays [bytes] like call audio (follows speakerphone/earpiece), then calls [done].
    private fun playMp3(bytes: ByteArray, done: () -> Unit) {
        val file = File.createTempFile("translation", ".mp3", cacheDir)
        file.writeBytes(bytes)
        val player = MediaPlayer()
        var finished = false
        val finish = {
            if (!finished) {
                finished = true
                players.remove(player)
                player.release()
                file.delete()
                done()
            }
        }
        try {
            player.setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            player.setDataSource(file.absolutePath)
            player.setOnCompletionListener { finish() }
            player.setOnErrorListener { _, _, _ -> finish(); true }
            player.setOnPreparedListener { it.start() }
            players.add(player)
            player.prepareAsync()
        } catch (e: Exception) {
            finish()
        }
    }

    private fun stopPlayback() {
        for (p in players.toList()) {
            try {
                p.stop()
            } catch (_: IllegalStateException) {
            }
            p.release()
        }
        players.clear()
    }

    /// Incoming-call pushes use this channel: high importance, rings and vibrates.
    private fun createCallsChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel("calls", "Calls", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Incoming and missed BoloAI calls"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 800, 600, 800, 600, 800)
            setSound(
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
                AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE).build()
            )
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
}

/// Turns WebRTC's recorded samples (16-bit, any rate/channels) into 16 kHz
/// mono 16-bit PCM and hands it on in ~100 ms chunks, the same format the
/// browser sends (what Speech-to-Text expects). Runs on WebRTC's audio thread.
private class Pcm16kSink(private val onChunk: (ByteArray) -> Unit) : AudioTrackSink {
    private val out = ShortArray(1600)
    private var n = 0
    private var pos = 0.0
    private var sum = 0.0
    private var count = 0

    override fun onData(
        audioData: ByteBuffer,
        bitsPerSample: Int,
        sampleRate: Int,
        numberOfChannels: Int,
        numberOfFrames: Int,
        absoluteCaptureTimestampMs: Long,
    ) {
        if (bitsPerSample != 16 || sampleRate <= 0 || numberOfChannels <= 0) return
        val samples = audioData.duplicate().order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
        val step = sampleRate / 16000.0
        val frames = samples.remaining() / numberOfChannels
        for (f in 0 until frames) {
            var frame = 0
            for (c in 0 until numberOfChannels) frame += samples.get(f * numberOfChannels + c)
            sum += frame.toDouble() / numberOfChannels
            count++
            pos++
            if (pos >= step) {
                pos -= step
                out[n++] = (sum / count).toInt().coerceIn(-32768, 32767).toShort()
                sum = 0.0
                count = 0
                if (n == out.size) {
                    val bytes = ByteBuffer.allocate(out.size * 2).order(ByteOrder.LITTLE_ENDIAN)
                    bytes.asShortBuffer().put(out)
                    onChunk(bytes.array())
                    n = 0
                }
            }
        }
    }
}
