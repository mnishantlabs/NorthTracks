import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Sparkles, Volume2, Radio, SkipForward } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';

interface CortanaControlProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  volume: number;
  setVolume: (vol: number) => void;
  addLog: (msg: string) => void;
}

export const CortanaControl: React.FC<CortanaControlProps> = ({
  isPlaying,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  volume,
  setVolume,
  addLog
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [cortanaStatus, setCortanaStatus] = useState<string>('Ready for "Hey Cortana" commands');
  const [studioDspEnabled, setStudioDspEnabled] = useState<boolean>(() => {
    return localStorage.getItem('northtracks-studio-dsp') === 'true';
  });

  const [recognition, setRecognition] = useState<any | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript.trim().toLowerCase();
        setLastCommand(transcript);
        processCortanaCommand(transcript);
      };

      rec.onerror = (event: any) => {
        console.warn('Cortana speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setCortanaStatus(`Cortana listener notice: ${event.error}`);
        }
      };

      rec.onend = () => {
        if (isListening) {
          try {
            rec.start();
          } catch (e) {}
        }
      };

      setRecognition(rec);
    } else {
      setCortanaStatus('Web Speech API simulated mode (Speech engine ready)');
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognition) {
        try { recognition.stop(); } catch (e) {}
      }
      setIsListening(false);
      setCortanaStatus('Cortana Standby Mode');
      addLog('[cortana] Cortana voice listening paused');
    } else {
      if (recognition) {
        try {
          recognition.start();
          setIsListening(true);
          setCortanaStatus('Listening... Say "Hey Cortana, play next track"');
          addLog('[cortana] Cortana listening active');
        } catch (e) {
          setIsListening(true);
          setCortanaStatus('Listening for voice triggers...');
        }
      } else {
        setIsListening(true);
        setCortanaStatus('Voice command mode active. Click quick action triggers below');
      }
    }
  };

  const processCortanaCommand = (cmd: string) => {
    addLog(`[cortana] Voice command detected: "${cmd}"`);
    if (cmd.includes('play') || cmd.includes('resume') || cmd.includes('start')) {
      if (!isPlaying) onTogglePlay();
      setCortanaStatus('Cortana: Resuming playback');
    } else if (cmd.includes('pause') || cmd.includes('stop')) {
      if (isPlaying) onTogglePlay();
      setCortanaStatus('Cortana: Playback paused');
    } else if (cmd.includes('next') || cmd.includes('skip')) {
      onNextTrack();
      setCortanaStatus('Cortana: Playing next track');
    } else if (cmd.includes('previous') || cmd.includes('back')) {
      onPrevTrack();
      setCortanaStatus('Cortana: Playing previous track');
    } else if (cmd.includes('volume up') || cmd.includes('louder')) {
      const newVol = Math.min(1.0, volume + 0.2);
      setVolume(newVol);
      setCortanaStatus(`Cortana: Volume increased to ${Math.round(newVol * 100)}%`);
    } else if (cmd.includes('volume down') || cmd.includes('quieter')) {
      const newVol = Math.max(0.0, volume - 0.2);
      setVolume(newVol);
      setCortanaStatus(`Cortana: Volume decreased to ${Math.round(newVol * 100)}%`);
    } else if (cmd.includes('bass') || cmd.includes('boost') || cmd.includes('equalizer')) {
      audioEngine.setPreset('BASS_BOOST');
      setCortanaStatus('Cortana: Bass Boost Equalizer Profile Activated');
    } else if (cmd.includes('spotify') || cmd.includes('youtube') || cmd.includes('studio') || cmd.includes('enhance')) {
      toggleStudioDsp(true);
      setCortanaStatus('Cortana: Spotify / YouTube Music Master DSP Enabled');
    } else {
      setCortanaStatus(`Cortana processed: "${cmd}"`);
    }
  };

  const toggleStudioDsp = (enable?: boolean) => {
    const nextState = enable !== undefined ? enable : !studioDspEnabled;
    setStudioDspEnabled(nextState);
    localStorage.setItem('northtracks-studio-dsp', String(nextState));
    if (nextState) {
      audioEngine.setPreset('BASS_BOOST');
      audioEngine.setReverb(0.15);
      audioEngine.setStereoWidth(0.2);
      addLog('[dsp] Spotify & YouTube Music Studio Master DSP Audio Processing Active');
    } else {
      audioEngine.setPreset('FLAT');
      audioEngine.setReverb(0.0);
      audioEngine.setStereoWidth(0.0);
      addLog('[dsp] Studio Master DSP set to Neutral Bypass');
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Cortana Trigger Halo Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Hey Cortana Assistant & Studio DSP Enhancer"
        style={{
          background: studioDspEnabled ? 'linear-gradient(135deg, rgba(0, 120, 212, 0.3) 0%, rgba(124, 92, 191, 0.3) 100%)' : 'transparent',
          border: isOpen ? '1px solid #0078d4' : '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: studioDspEnabled ? '#60a5fa' : 'var(--text-secondary)',
          boxShadow: isListening ? '0 0 12px #0078d4' : 'none',
          transition: 'all 0.2s ease',
          padding: 0
        }}
      >
        {isListening ? (
          <span className="cortana-pulse-ring" style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#0078d4',
            boxShadow: '0 0 8px #60a5fa',
            display: 'block'
          }} />
        ) : (
          <Sparkles size={16} />
        )}
      </button>

      {/* Cortana Modal / Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '44px',
            right: '0',
            width: '320px',
            backgroundColor: 'var(--bg-surface, #1e1e1e)',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
            zIndex: 9999,
            color: 'var(--text-primary, #fff)'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0078d4 0%, #7c5cbf 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={13} color="#fff" />
              </div>
              <span style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '0.3px' }}>Hey Cortana Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ×
            </button>
          </div>

          {/* Cortana Halo Listening Status */}
          <div style={{
            background: 'rgba(0, 120, 212, 0.1)',
            border: '1px solid rgba(0, 120, 212, 0.25)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
            marginBottom: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <button
                onClick={toggleListening}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: isListening ? '#0078d4' : 'rgba(255,255,255,0.08)',
                  border: '2px solid #0078d4',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isListening ? '0 0 16px rgba(0, 120, 212, 0.8)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {isListening ? <Mic size={22} /> : <MicOff size={22} />}
              </button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {cortanaStatus}
            </div>
            {lastCommand && (
              <div style={{ fontSize: '11px', color: '#60a5fa', marginTop: '4px', fontStyle: 'italic' }}>
                "{lastCommand}"
              </div>
            )}
          </div>

          {/* Studio Master DSP Enhancer Switch */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radio size={14} color="#3b82f6" />
                Spotify & YouTube Music DSP
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Studio Dynamic Compression & Loudness
              </div>
            </div>
            <button
              onClick={() => toggleStudioDsp()}
              style={{
                width: '42px',
                height: '22px',
                borderRadius: '12px',
                backgroundColor: studioDspEnabled ? '#0078d4' : 'rgba(255,255,255,0.2)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                position: 'absolute',
                top: '3px',
                left: studioDspEnabled ? '23px' : '3px',
                transition: 'left 0.2s'
              }} />
            </button>
          </div>

          {/* Quick Cortana Voice Commands */}
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            QUICK VOICE COMMANDS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              onClick={() => processCortanaCommand('play next track')}
              style={{
                padding: '6px 8px',
                fontSize: '11px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <SkipForward size={12} /> "Next Track"
            </button>
            <button
              onClick={() => processCortanaCommand('increase volume')}
              style={{
                padding: '6px 8px',
                fontSize: '11px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Volume2 size={12} /> "Volume Up"
            </button>
            <button
              onClick={() => processCortanaCommand('enable bass boost')}
              style={{
                padding: '6px 8px',
                fontSize: '11px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Sparkles size={12} /> "Bass Boost"
            </button>
            <button
              onClick={() => processCortanaCommand('activate spotify mode')}
              style={{
                padding: '6px 8px',
                fontSize: '11px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Radio size={12} /> "Spotify Mode"
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
