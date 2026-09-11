import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, 
  RefreshCw, 
  Music2, 
  Sparkles, 
  Music, 
  TrendingUp, 
  Radio, 
  Flame,
  Zap,
  Play,
  User,
  Youtube,
  Heart,
  Headphones,
  Globe,
  Layers,
  ChevronDown,
  Settings,
  ShieldCheck,
  ExternalLink,
  Download
} from 'lucide-react';
import { ArtistLinks } from './ArtistLinks';
import { AccountSignInModal } from './AccountSignInModal';

export interface Track {
  filePath: string;
  title: string;
  artist: string;
  album: string;
  genre: string[];
  duration: number;
  bitrate: number;
  isDuplicate?: boolean;
  coverArt?: string;
  isOnline?: boolean;
  previewUrl?: string;
}

interface ExploreViewProps {
  onNavigateToGenre?: (genre: string) => void;
  tracks: Track[];
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onNavigateToArtist?: (artistName: string) => void;
  onDownloadTrack: (track: Track) => Promise<void>;
  likedTracks: string[];
  onToggleLike: (filePath: string) => void;
  downloadingPaths?: string[];
  downloadedPaths?: string[];
  onNavigateToSettings?: () => void;
}

// Category Cards definitions styled identically to Trending Hits cards
const CATEGORY_CARDS = [
  { 
    id: 'top hits', 
    label: 'Top Global Hits', 
    subLabel: '500+ Trending Tracks',
    Icon: Flame,
    gradient: 'linear-gradient(135deg, #ef4444 0%, #7c5cbf 100%)',
    bgCover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'
  },
  { 
    id: 'pop', 
    label: 'Pop Hits', 
    subLabel: '350+ Chart Toppers',
    Icon: Music,
    gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    bgCover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80'
  },
  { 
    id: 'hip-hop', 
    label: 'Hip-Hop & Rap', 
    subLabel: '400+ Beat Bangers',
    Icon: TrendingUp,
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    bgCover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80'
  },
  { 
    id: 'rock', 
    label: 'Rock Classics', 
    subLabel: '280+ Guitar Anthems',
    Icon: Radio,
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    bgCover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&auto=format&fit=crop&q=80'
  },
  { 
    id: 'lofi chill', 
    label: 'Lofi & Chill', 
    subLabel: '200+ Study Beats',
    Icon: Sparkles,
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    bgCover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80'
  },
  { 
    id: 'electronic edm', 
    label: 'Electronic EDM', 
    subLabel: '300+ Club Drops',
    Icon: Zap,
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    bgCover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&auto=format&fit=crop&q=80'
  },
  { 
    id: 'indie acoustic', 
    label: 'Indie Folk', 
    subLabel: '180+ Acoustic Vibe',
    Icon: Music2,
    gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    bgCover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&auto=format&fit=crop&q=80'
  },
  { 
    id: 'rnb soul', 
    label: 'R&B / Soul', 
    subLabel: '220+ Smooth Grooves',
    Icon: Headphones,
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
    bgCover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80'
  },
];

const formatDuration = (secs: number) => {
  if (isNaN(secs) || secs === Infinity || secs <= 0) return '0:30';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const ExploreView: React.FC<ExploreViewProps> = ({
  tracks = [],
  onPlayTrack,
  onNavigateToArtist,
  onDownloadTrack,
  likedTracks = [],
  onToggleLike,
  downloadingPaths = [],
  downloadedPaths = [],
  onNavigateToSettings
}) => {
  const [activeCategory, setActiveCategory] = useState('top hits');
  const [mergeLikeAndDownload] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('northtracks-merge-like-download');
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [onlineTracks, setOnlineTracks] = useState<Track[]>(() => {
    try {
      const cached = localStorage.getItem(`northtracks-explore-cache-top hits`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const [downloadingMap, setDownloadingMap] = useState<Record<string, boolean>>({});
  const [downloadedMap, setDownloadedMap] = useState<Record<string, boolean>>({});
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [syncedYtTracks] = useState<Track[]>([]);

  const profileRef = useRef<HTMLDivElement>(null);
  const categoriesScrollRef = useRef<HTMLDivElement>(null);

  // Mouse wheel horizontal scroll handler for category cards
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        const container = e.currentTarget as HTMLDivElement;
        if (container) {
          container.scrollLeft += e.deltaY;
        }
      }
    };
    const el = categoriesScrollRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (el) el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Sync downloading / downloaded paths from props if provided
  useEffect(() => {
    const dMap: Record<string, boolean> = {};
    downloadingPaths.forEach(p => dMap[p] = true);
    setDownloadingMap(prev => ({ ...prev, ...dMap }));
  }, [downloadingPaths]);

  useEffect(() => {
    const dMap: Record<string, boolean> = {};
    downloadedPaths.forEach(p => dMap[p] = true);
    setDownloadedMap(prev => ({ ...prev, ...dMap }));
  }, [downloadedPaths]);

  const [favoriteCategoryIds, setFavoriteCategoryIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('northtracks-favorite-playlists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleFavoritePlaylist = async (cat: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFav = favoriteCategoryIds.includes(cat.id);
    let updated: string[];
    if (isFav) {
      updated = favoriteCategoryIds.filter(id => id !== cat.id);
    } else {
      updated = [...favoriteCategoryIds, cat.id];
    }
    setFavoriteCategoryIds(updated);
    try {
      localStorage.setItem('northtracks-favorite-playlists', JSON.stringify(updated));
    } catch (err) {}

    if (window.electronAPI?.savePlaylists && window.electronAPI?.getPlaylists) {
      try {
        const existingPl = await window.electronAPI.getPlaylists() || [];
        const found = existingPl.find((p: any) => p.name === cat.label);
        let nextPlaylists;
        if (found) {
          nextPlaylists = existingPl.filter((p: any) => p.name !== cat.label);
        } else {
          nextPlaylists = [...existingPl, {
            id: `fav-${cat.id}`,
            name: cat.label,
            tracks: [],
            coverArt: cat.bgCover
          }];
        }
        await window.electronAPI.savePlaylists(nextPlaylists);
      } catch (err) {
        console.error('Failed to sync favorite playlist:', err);
      }
    }
  };

  // Close profile popup menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Load category tracks with disk caching
  const fetchCatalog = async (term: string) => {
    const cacheKey = `northtracks-explore-cache-${term}`;
    
    // Read local cache first to ensure instant tab switching without whiteout
    try {
      const savedCache = localStorage.getItem(cacheKey);
      if (savedCache) {
        const parsed = JSON.parse(savedCache);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOnlineTracks(parsed);
        }
      }
    } catch (e) {
      console.error('Cache read error:', e);
    }

    setLoading(true);
    try {
      if (window.electronAPI?.searchOnlineMusic) {
        const results = await window.electronAPI.searchOnlineMusic(term);
        if (Array.isArray(results) && results.length > 0) {
          setOnlineTracks(results);
          // Persist in local storage cache
          try {
            localStorage.setItem(cacheKey, JSON.stringify(results));
          } catch (e) {
            console.error('Cache save error:', e);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch online music catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog(activeCategory);
  }, [activeCategory]);

  // Derive personalized recommendations based on local PC music files
  useEffect(() => {
    if (tracks && tracks.length > 0 && activeCategory === 'top hits') {
      const genreCounts: Record<string, number> = {};
      tracks.forEach((t: Track) => {
        if (t.genre && t.genre[0]) {
          const g = t.genre[0].trim();
          if (g && g.toLowerCase() !== 'unsorted' && g.toLowerCase() !== 'unknown') {
            genreCounts[g] = (genreCounts[g] || 0) + 1;
          }
        }
      });
      const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (topGenre) {
        fetchCatalog(topGenre);
      }
    }
  }, [tracks]);

  const handleCategoryClick = (catId: string) => {
    setActiveCategory(catId);
    setVisibleCount(30);
  };

  // Smart Like & Auto-Download Action (320kbps MP3 to Music Folder)
  const handleSmartLike = async (track: Track, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const trackId = track.previewUrl || track.filePath;
    
    // Toggle liked status in app state
    onToggleLike(trackId);

    // If not downloaded yet, automatically download in best quality (320kbps)
    if (!downloadedMap[trackId] && !downloadingMap[trackId]) {
      setDownloadingMap(prev => ({ ...prev, [trackId]: true }));
      try {
        await onDownloadTrack(track);
        setDownloadedMap(prev => ({ ...prev, [trackId]: true }));
      } catch (err) {
        console.error('Auto-download failed:', err);
      } finally {
        setDownloadingMap(prev => ({ ...prev, [trackId]: false }));
      }
    }
  };

  const isTrackLiked = (track: Track) => {
    const id = track.previewUrl || track.filePath;
    return likedTracks.includes(id) || downloadedMap[id];
  };

  const displayedTracks = onlineTracks.slice(0, visibleCount);

  return (
    <div className="content-area fade-in" style={{ padding: '20px 24px', height: '100%', overflowY: 'auto', gap: '22px', display: 'flex', flexDirection: 'column' }}>
      
      {/* Account Sign In / Sync Modal */}
      <AccountSignInModal 
        isOpen={accountModalOpen} 
        onClose={() => setAccountModalOpen(false)} 
      />

      {/* Header Bar with Sleek Single Circle Profile Icon */}
      <div 
        className="library-toolbar" 
        style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          paddingBottom: '4px'
        }}
      >
        {/* Left: Page Title */}
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            padding: '9px',
            borderRadius: '10px',
            background: 'rgba(124, 92, 191, 0.15)',
            color: 'var(--primary, #7c5cbf)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Compass size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Explore Music Catalog</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Stream unlimited songs, browse visual categories, and auto-download in 320kbps</p>
          </div>
        </div>

        {/* Right: Sleek Single Circle Profile Icon with Popup Menu */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c5cbf 0%, #FF0000 100%)',
              border: '2px solid var(--border, rgba(255, 255, 255, 0.2))',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              outline: 'none'
            }}
            title="User Account & Platform Integrations"
          >
            <User size={20} />
          </button>

          {/* Corner Popup Menu */}
          {profileMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '230px',
                background: 'var(--bg-surface, #1e1e24)',
                border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
                borderRadius: '14px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
                padding: '8px',
                zIndex: 999,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
              className="fade-in"
            >
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.08))' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Account &amp; Sync</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>YouTube Music • Spotify</div>
              </div>

              <button
                onClick={() => {
                  setProfileMenuOpen(false);
                  setAccountModalOpen(true);
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <ShieldCheck size={16} style={{ color: 'var(--primary)' }} />
                <span>Connect &amp; Sign In</span>
              </button>

              <button
                onClick={() => {
                  setProfileMenuOpen(false);
                  if (onNavigateToSettings) onNavigateToSettings();
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Settings size={16} style={{ color: 'var(--primary)' }} />
                <span>Open Settings</span>
                <ExternalLink size={12} style={{ marginLeft: 'auto', opacity: 0.6 }} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Visual Music Categories Section (Matching Trending Cards Design) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} style={{ color: 'var(--primary, #7c5cbf)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Song Categories
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Select category to filter online hits</span>
        </div>

        <div 
          ref={categoriesScrollRef}
          style={{ 
            display: 'flex', 
            gap: '14px', 
            overflowX: 'auto', 
            paddingBottom: '8px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
          className="no-scrollbar"
        >
          {CATEGORY_CARDS.map((cat) => {
            const isActive = activeCategory === cat.id;

            return (
              <div
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                style={{
                  width: '160px',
                  minWidth: '160px',
                  maxWidth: '160px',
                  padding: '8px',
                  boxSizing: 'border-box',
                  background: 'var(--color-background-secondary)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                  border: isActive ? '2px solid var(--primary, #7c5cbf)' : '1px solid transparent',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              >
                {/* 1:1 Aspect Ratio Cover Container */}
                <div 
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: 'var(--bg-main)',
                    position: 'relative'
                  }}
                >
                  <img 
                    src={cat.bgCover} 
                    alt={cat.label}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <button
                    onClick={(e) => handleFavoritePlaylist(cat, e)}
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: 'none',
                      borderRadius: '50%',
                      padding: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: favoriteCategoryIds.includes(cat.id) ? '#ef4444' : '#ffffff',
                      transition: 'transform 0.2s ease',
                      zIndex: 3
                    }}
                    title={favoriteCategoryIds.includes(cat.id) ? "Saved to Library Playlists" : "Favorite playlist to Library"}
                  >
                    <Heart size={14} fill={favoriteCategoryIds.includes(cat.id) ? '#ef4444' : 'none'} />
                  </button>
                </div>

                {/* Category Title & Subtitle */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div 
                    style={{ 
                      fontSize: '13px', 
                      fontWeight: 600, 
                      color: 'var(--text-primary)', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      margin: 0 
                    }}
                    title={cat.label}
                  >
                    {cat.label}
                  </div>
                  <div 
                    style={{ 
                      fontSize: '11px', 
                      color: 'var(--color-text-tertiary, var(--text-secondary))', 
                      margin: 0 
                    }}
                  >
                    {cat.subLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Authentic Account History Section (Only shown if connected with synced tracks) */}
      {syncedYtTracks.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Youtube size={18} style={{ color: '#FF0000' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                YouTube Music Listened Tracks
              </h3>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Synced from YouTube account history</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
            {syncedYtTracks.map((ytTrack) => {
              const trackId = ytTrack.previewUrl || ytTrack.filePath;
              const isDownloading = downloadingMap[trackId];
              const liked = isTrackLiked(ytTrack);

              return (
                <div
                  key={ytTrack.filePath}
                  onClick={() => onPlayTrack(ytTrack, syncedYtTracks)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'var(--bg-surface, rgba(255, 255, 255, 0.04))',
                    border: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  className="top-song-row"
                >
                  <div style={{ width: '42px', height: '42px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                    <img src={ytTrack.coverArt} alt={ytTrack.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div className="play-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Play size={14} color="#ffffff" fill="#ffffff" />
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ytTrack.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <ArtistLinks artist={ytTrack.artist} onNavigate={onNavigateToArtist || (() => {})} />
                    </div>
                  </div>

                  {/* Smart Heart / Like Auto-Download Button */}
                  <button
                    onClick={(e) => handleSmartLike(ytTrack, e)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: liked ? '#ef4444' : 'var(--text-secondary)',
                      padding: '8px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0
                    }}
                    title={liked ? "Liked & Downloaded to Music folder" : "Like song & auto-download in 320kbps"}
                  >
                    {isDownloading ? (
                      <RefreshCw size={16} className="logo-icon" style={{ color: 'var(--primary)' }} />
                    ) : (
                      <Heart 
                        size={18} 
                        fill={liked ? '#ef4444' : 'none'} 
                        color={liked ? '#ef4444' : 'var(--text-secondary)'} 
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Inviting Banner when account is not connected */
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          background: 'var(--bg-surface, rgba(255, 255, 255, 0.03))',
          border: '1px dashed var(--border, rgba(255, 255, 255, 0.12))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255, 0, 0, 0.1)', color: '#FF0000' }}>
              <Youtube size={20} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Sync YouTube Music &amp; Spotify History</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Connect your account to display your listened songs and personalized recommendations here.
              </div>
            </div>
          </div>
          <button
            onClick={() => setAccountModalOpen(true)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'var(--primary, #7c5cbf)',
              border: 'none',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Connect Account
          </button>
        </div>
      )}

      {/* Unlimited Online Music Catalog Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={18} style={{ color: 'var(--primary, #7c5cbf)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Online Song Catalog ({onlineTracks.length} Tracks)
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Showing {displayedTracks.length} of {onlineTracks.length} songs
          </span>
        </div>

        {loading && onlineTracks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '220px', gap: '12px' }}>
            <RefreshCw size={32} className="logo-icon" style={{ color: 'var(--primary, #7c5cbf)' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Searching online music catalog...</span>
          </div>
        ) : onlineTracks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '220px', gap: '12px' }}>
            <Music2 size={44} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No online songs found</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Select a category card above or search using the top titlebar search bar.</span>
          </div>
        ) : (
          <>
            {/* Catalog Songs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
              {displayedTracks.map((track, idx) => {
                const rank = idx + 1;
                const trackId = track.previewUrl || track.filePath;
                const isDownloading = downloadingMap[trackId];
                const liked = isTrackLiked(track);

                return (
                  <div
                    key={`online-song-${trackId}-${idx}`}
                    className="top-song-row"
                    onClick={() => onPlayTrack(track, onlineTracks)}
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: '10px', 
                      background: 'var(--bg-surface, rgba(255, 255, 255, 0.04))', 
                      border: '1px solid var(--border, rgba(255, 255, 255, 0.06))', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: 'pointer',
                      transition: 'all 0.2s ease' 
                    }}
                  >
                    {/* High Contrast Black Rank Number */}
                    <span className="top-song-rank" style={{ fontWeight: 700, color: 'var(--text-primary, #000000)', fontSize: '13px', width: '28px' }}>
                      #{rank}
                    </span>

                    {track.coverArt ? (
                      <img className="top-song-art" src={track.coverArt} alt="" style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover' }} />
                    ) : (
                      <div className="top-song-art" style={{ width: '42px', height: '42px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-muted)' }}>
                        <Music2 size={20} />
                      </div>
                    )}

                    <div className="top-song-info" style={{ flex: 1, minWidth: 0 }}>
                      <div className="top-song-title" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {track.title}
                      </div>
                      <div className="top-song-artist" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <ArtistLinks artist={track.artist} onNavigate={onNavigateToArtist || (() => {})} />
                      </div>
                    </div>

                    <span className="top-song-duration" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {formatDuration(track.duration)}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {/* Heart (Like) Button */}
                      <button
                        onClick={(e) => {
                          if (mergeLikeAndDownload) {
                            handleSmartLike(track, e);
                          } else {
                            if (e) e.stopPropagation();
                            onToggleLike(trackId);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: liked ? '#ef4444' : 'var(--text-secondary)',
                          padding: '6px',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title={mergeLikeAndDownload ? (liked ? "Liked & Downloaded to Music folder" : "Like track & auto-download in 320kbps") : (liked ? "Unlike Track" : "Like Track")}
                      >
                        {mergeLikeAndDownload && isDownloading ? (
                          <RefreshCw size={16} className="logo-icon" style={{ color: 'var(--primary)' }} />
                        ) : (
                          <Heart size={18} fill={liked ? '#ef4444' : 'none'} color={liked ? '#ef4444' : 'var(--text-secondary)'} />
                        )}
                      </button>

                      {/* Dedicated Download Button (rendered only if mergeLikeAndDownload is false) */}
                      {!mergeLikeAndDownload && (
                        <button
                          onClick={async (e) => {
                            if (e) e.stopPropagation();
                            setDownloadingMap(prev => ({ ...prev, [trackId]: true }));
                            try {
                              await onDownloadTrack(track);
                              setDownloadedMap(prev => ({ ...prev, [trackId]: true }));
                            } catch (err) {
                              console.error('Download error:', err);
                            } finally {
                              setDownloadingMap(prev => ({ ...prev, [trackId]: false }));
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: downloadedMap[trackId] ? 'var(--primary)' : 'var(--text-secondary)',
                            padding: '6px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title={downloadedMap[trackId] ? "Downloaded to Music Folder" : "Download full 320kbps MP3 track to Music folder"}
                        >
                          {isDownloading ? (
                            <RefreshCw size={16} className="logo-icon" style={{ color: 'var(--primary)' }} />
                          ) : (
                            <Download size={18} color={downloadedMap[trackId] ? 'var(--primary)' : 'var(--text-secondary)'} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More Button for Infinite Catalog Scroll */}
            {visibleCount < onlineTracks.length && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                <button
                  onClick={() => setVisibleCount(prev => prev + 25)}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '20px',
                    background: 'var(--bg-surface, rgba(255, 255, 255, 0.06))',
                    border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ChevronDown size={16} />
                  <span>Load More Online Songs ({onlineTracks.length - visibleCount} remaining)</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
