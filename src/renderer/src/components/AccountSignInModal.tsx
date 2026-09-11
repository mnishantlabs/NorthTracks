import React, { useState } from 'react';
import { X, Youtube, Music, Disc, Key, Check, Globe } from 'lucide-react';

interface AccountSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountSignInModal: React.FC<AccountSignInModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'youtube' | 'spotify' | 'apple' | 'lastfm'>('youtube');
  
  // YouTube config
  const [ytApiKey, setYtApiKey] = useState('');
  const [ytConnected, setYtConnected] = useState(true);

  // Spotify config
  const [spotifyClientId, setSpotifyClientId] = useState('');
  const [spotifyConnected, setSpotifyConnected] = useState(false);

  // Apple Music config
  const [appleToken, setAppleToken] = useState('');
  const [appleConnected, setAppleConnected] = useState(false);

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--bg-surface, #1e1e24)',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
        className="fade-in"
      >
        {/* Modal Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(124, 92, 191, 0.15)',
              color: 'var(--primary, #7c5cbf)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Globe size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Account &amp; Platform Sync
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Link streaming platforms using simple API keys or quick login
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
          padding: '0 16px',
          background: 'var(--bg-main, rgba(0, 0, 0, 0.15))'
        }}>
          <button
            onClick={() => setActiveTab('youtube')}
            style={{
              padding: '12px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'youtube' ? '2px solid #FF0000' : '2px solid transparent',
              color: activeTab === 'youtube' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Youtube size={16} style={{ color: '#FF0000' }} />
            <span>YouTube Music</span>
          </button>

          <button
            onClick={() => setActiveTab('spotify')}
            style={{
              padding: '12px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'spotify' ? '2px solid #1DB954' : '2px solid transparent',
              color: activeTab === 'spotify' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Music size={16} style={{ color: '#1DB954' }} />
            <span>Spotify</span>
          </button>

          <button
            onClick={() => setActiveTab('apple')}
            style={{
              padding: '12px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'apple' ? '2px solid #FA243C' : '2px solid transparent',
              color: activeTab === 'apple' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Disc size={16} style={{ color: '#FA243C' }} />
            <span>Apple Music</span>
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeTab === 'youtube' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(255, 0, 0, 0.08)',
                border: '1px solid rgba(255, 0, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>YouTube Music Account Status</div>
                  <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '2px' }}>
                    {ytConnected ? '● Connected & Ready to Sync' : 'Disconnected'}
                  </div>
                </div>
                <button
                  onClick={() => setYtConnected(!ytConnected)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: ytConnected ? 'rgba(255,255,255,0.06)' : '#FF0000',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {ytConnected ? 'Disconnect' : 'Connect Account'}
                </button>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  YouTube Data API Key (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <Key size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="password"
                    placeholder="Enter API Key (AIzaSy...)"
                    value={ytApiKey}
                    onChange={(e) => setYtApiKey(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      borderRadius: '8px',
                      background: 'var(--bg-main, rgba(0, 0, 0, 0.2))',
                      border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                </div>
                <small style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  Provides higher rate limits for fetching YouTube Music playlists and listened history.
                </small>
              </div>
            </div>
          )}

          {activeTab === 'spotify' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(29, 185, 84, 0.08)',
                border: '1px solid rgba(29, 185, 84, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Spotify Integration</div>
                  <div style={{ fontSize: '11px', color: spotifyConnected ? '#22c55e' : 'var(--text-secondary)', marginTop: '2px' }}>
                    {spotifyConnected ? '● Connected' : 'Not Connected'}
                  </div>
                </div>
                <button
                  onClick={() => setSpotifyConnected(!spotifyConnected)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#1DB954',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {spotifyConnected ? 'Disconnect' : 'Connect Spotify'}
                </button>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Spotify Client ID
                </label>
                <input
                  type="text"
                  placeholder="Enter Client ID from Spotify Developer Dashboard"
                  value={spotifyClientId}
                  onChange={(e) => setSpotifyClientId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-main, rgba(0, 0, 0, 0.2))',
                    border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'apple' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(250, 36, 60, 0.08)',
                border: '1px solid rgba(250, 36, 60, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Apple Music Integration</div>
                  <div style={{ fontSize: '11px', color: appleConnected ? '#22c55e' : 'var(--text-secondary)', marginTop: '2px' }}>
                    {appleConnected ? '● Connected' : 'Not Connected'}
                  </div>
                </div>
                <button
                  onClick={() => setAppleConnected(!appleConnected)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#FA243C',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {appleConnected ? 'Disconnect' : 'Connect Apple Music'}
                </button>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Apple Music Developer Token
                </label>
                <input
                  type="password"
                  placeholder="Enter MusicKit Token"
                  value={appleToken}
                  onChange={(e) => setAppleToken(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-main, rgba(0, 0, 0, 0.2))',
                    border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div style={{
          padding: '14px 22px',
          borderTop: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '10px',
          background: 'var(--bg-main, rgba(0, 0, 0, 0.1))'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: savedSuccess ? '#22c55e' : 'var(--primary, #7c5cbf)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            {savedSuccess ? (
              <>
                <Check size={14} />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save &amp; Sync</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
