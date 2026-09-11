import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Music, 
  Sparkles, 
  Minus, 
  Maximize2, 
  FolderDown, 
  Filter,
  CheckSquare,
  Square
} from 'lucide-react';
import { TrackInfo } from '../../../main/scanner';

interface AutoScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: () => void;
  targetRoots?: string[];
}

const AVAILABLE_EXTENSIONS = [
  { id: '.mp3', label: '.MP3 Audio', defaultChecked: true },
  { id: '.flac', label: '.FLAC Lossless', defaultChecked: true },
  { id: '.m4a', label: '.M4A / AAC', defaultChecked: true },
  { id: '.wav', label: '.WAV Audio', defaultChecked: false },
  { id: '.ogg', label: '.OGG Vorbis', defaultChecked: false },
  { id: '.wma', label: '.WMA Windows', defaultChecked: false },
];

export const AutoScanModal: React.FC<AutoScanModalProps> = ({ isOpen, onClose, onScanComplete, targetRoots }) => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'review' | 'organizing' | 'completed' | 'error'>('idle');
  const [scanStage, setScanStage] = useState<'scanning' | 'metadata'>('scanning');
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Format extensions selection
  const [selectedExts, setSelectedExts] = useState<Record<string, boolean>>({
    '.mp3': true,
    '.flac': true,
    '.m4a': true,
    '.wav': false,
    '.ogg': false,
    '.wma': false
  });

  const [scannedFiles, setScannedFiles] = useState(0);
  const [foundCandidates, setFoundCandidates] = useState(0);
  const [currentDir, setCurrentDir] = useState('');
  const [metadataCurrent, setMetadataCurrent] = useState(0);
  const [metadataTotal, setMetadataTotal] = useState(0);
  const [metadataTrackName, setMetadataTrackName] = useState('');
  const [organizeCurrent, setOrganizeCurrent] = useState(0);
  const [organizeTotal, setOrganizeTotal] = useState(0);
  const [currentTrackName, setCurrentTrackName] = useState('');

  // Post-scan review tracks
  const [discoveredTracks, setDiscoveredTracks] = useState<TrackInfo[]>([]);
  const [selectedTrackMap, setSelectedTrackMap] = useState<Record<string, boolean>>({});

  const [summary, setSummary] = useState<{ successCount: number; enrichedCount: number; totalCount: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let unbindScan: (() => void) | undefined = undefined;
    let unbindOrganize: (() => void) | undefined = undefined;

    if (window.electronAPI?.onScanAllDrivesProgress) {
      unbindScan = window.electronAPI.onScanAllDrivesProgress((progress: any) => {
        if (progress.stage) {
          setScanStage(progress.stage);
        }
        if (progress.scannedFiles !== undefined) setScannedFiles(progress.scannedFiles);
        if (progress.foundCandidates !== undefined) setFoundCandidates(progress.foundCandidates);
        if (progress.currentDir !== undefined) setCurrentDir(progress.currentDir);
        if (progress.metadataCurrent !== undefined) setMetadataCurrent(progress.metadataCurrent);
        if (progress.metadataTotal !== undefined) setMetadataTotal(progress.metadataTotal);
        if (progress.currentTrackName !== undefined) setMetadataTrackName(progress.currentTrackName);
      });
    }

    if (window.electronAPI?.onAutoOrganizeProgress) {
      unbindOrganize = window.electronAPI.onAutoOrganizeProgress((progress: { current: number; total: number; trackName: string }) => {
        setOrganizeCurrent(progress.current);
        setOrganizeTotal(progress.total);
        setCurrentTrackName(progress.trackName);
      });
    }

    return () => {
      if (unbindScan) unbindScan();
      if (unbindOrganize) unbindOrganize();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCancel = async () => {
    if (window.electronAPI?.cancelScan) {
      await window.electronAPI.cancelScan();
    }
    setStatus('idle');
    setIsMinimized(false);
    onClose();
  };

  const toggleExtension = (ext: string) => {
    setSelectedExts(prev => ({ ...prev, [ext]: !prev[ext] }));
  };

  const handleStartFullScan = async () => {
    setStatus('scanning');
    setScanStage('scanning');
    setScannedFiles(0);
    setFoundCandidates(0);
    setMetadataCurrent(0);
    setMetadataTotal(0);
    setMetadataTrackName('');
    setErrorMsg('');

    const activeExts = Object.keys(selectedExts).filter(k => selectedExts[k]);

    try {
      if (!window.electronAPI?.scanAllDrives) {
        throw new Error('Electron API scanAllDrives is not available.');
      }

      const candidateTracks = await window.electronAPI.scanAllDrives(targetRoots, activeExts);
      
      if (!candidateTracks || candidateTracks.length === 0) {
        setStatus('completed');
        setSummary({ successCount: 0, enrichedCount: 0, totalCount: 0 });
        return;
      }

      // Initialize review track selection map (all selected by default)
      const selMap: Record<string, boolean> = {};
      candidateTracks.forEach((t: TrackInfo) => {
        selMap[t.filePath] = true;
      });
      setSelectedTrackMap(selMap);
      setDiscoveredTracks(candidateTracks);
      setStatus('review');
      setIsMinimized(false);
    } catch (err: any) {
      console.error('Auto scan failed:', err);
      setErrorMsg(err.message || 'Failed to scan PC music.');
      setStatus('error');
    }
  };

  const handleConfirmOrganizeSelected = async () => {
    const selectedTracks = discoveredTracks.filter(t => selectedTrackMap[t.filePath]);
    if (selectedTracks.length === 0) return;

    setStatus('organizing');
    setOrganizeCurrent(0);
    setOrganizeTotal(selectedTracks.length);

    try {
      if (window.electronAPI?.autoOrganizeAllMusic) {
        const result = await window.electronAPI.autoOrganizeAllMusic(selectedTracks);
        setSummary(result);
        setStatus('completed');
        onScanComplete();
      }
    } catch (err: any) {
      console.error('Organize failed:', err);
      setErrorMsg(err.message || 'Failed to organize tracks into Music folder.');
      setStatus('error');
    }
  };

  const toggleSelectAllTracks = (select: boolean) => {
    const nextMap: Record<string, boolean> = {};
    discoveredTracks.forEach(t => {
      nextMap[t.filePath] = select;
    });
    setSelectedTrackMap(nextMap);
  };

  const toggleTrackSelection = (filePath: string) => {
    setSelectedTrackMap(prev => ({ ...prev, [filePath]: !prev[filePath] }));
  };

  // Format seconds to mm:ss
  const formatSecs = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Render Minimized Floating Pill Badge at Bottom Right ───────────────────
  if (isMinimized) {
    let progressPercent = 0;
    let label = 'Scanning Drives...';

    if (status === 'scanning') {
      if (scanStage === 'metadata') {
        progressPercent = metadataTotal > 0 ? Math.round((metadataCurrent / metadataTotal) * 100) : 0;
        label = `Parsing Metadata (${progressPercent}%)`;
      } else {
        label = `Scanning Files (${scannedFiles.toLocaleString()})`;
      }
    } else if (status === 'organizing') {
      progressPercent = organizeTotal > 0 ? Math.round((organizeCurrent / organizeTotal) * 100) : 0;
      label = `Organizing Tracks (${progressPercent}%)`;
    }

    return (
      <div
        onClick={() => setIsMinimized(false)}
        style={{
          position: 'fixed',
          bottom: '88px',
          right: '24px',
          zIndex: 99999,
          background: 'var(--bg-surface, #1e1e24)',
          border: '1px solid var(--primary, #7c5cbf)',
          borderRadius: '24px',
          padding: '10px 18px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          transition: 'all 0.25s ease'
        }}
        className="fade-in"
        title="Click to expand scan progress"
      >
        <RefreshCw size={18} className="logo-icon" style={{ color: 'var(--primary, #7c5cbf)' }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
            ⚡ Rapid PC Scanner
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {label}
          </span>
        </div>
        <Maximize2 size={16} style={{ color: 'var(--primary, #7c5cbf)', marginLeft: '4px' }} />
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface, #18181b)',
        border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
        borderRadius: '16px',
        padding: '26px',
        maxWidth: status === 'review' ? '720px' : '520px',
        width: '100%',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        color: 'var(--text-primary, #ffffff)',
        fontFamily: 'inherit',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Header Bar with Minimize & Close Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              padding: '9px',
              borderRadius: '12px',
              background: 'rgba(124, 92, 191, 0.15)',
              color: 'var(--primary, #7c5cbf)',
              border: '1px solid rgba(124, 92, 191, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Rapid PC Music Scanner</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary, #a1a1aa)', margin: '2px 0 0 0' }}>
                Auto-scans drives, filters recordings, &amp; organizes into Music folder
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Minimize Button */}
            {(status === 'scanning' || status === 'organizing') && (
              <button
                onClick={() => setIsMinimized(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Minimize scanner modal to floating badge"
              >
                <Minus size={16} />
              </button>
            )}

            {/* Close Button */}
            {status !== 'scanning' && status !== 'organizing' && (
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary, #a1a1aa)',
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
            )}
          </div>
        </div>

        {/* State: Idle */}
        {status === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto' }}>
            <div style={{
              background: 'var(--bg-main, rgba(255, 255, 255, 0.04))',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '13px',
              color: 'var(--text-secondary, #d4d4d8)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary, #7c5cbf)', fontWeight: 600, marginBottom: '8px' }}>
                <Sparkles size={16} /> Rapid Full-PC Drive Indexing
              </div>
              <p style={{ margin: '0 0 10px 0', lineHeight: '1.5', fontSize: '12px' }}>
                NorthTracks will crawl all local drives (<code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>C:\</code>, <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>D:\</code>), skipping call recordings &amp; voice memos automatically.
              </p>
            </div>

            {/* Extension Filter Checkboxes */}
            <div style={{
              padding: '14px',
              borderRadius: '12px',
              background: 'var(--bg-main, rgba(255, 255, 255, 0.03))',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.08))'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={14} style={{ color: 'var(--primary)' }} /> Select Audio Formats to Include:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {AVAILABLE_EXTENSIONS.map(ext => (
                  <label 
                    key={ext.id}
                    onClick={() => toggleExtension(ext.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <input 
                      type="checkbox"
                      checked={selectedExts[ext.id]}
                      onChange={() => {}}
                      style={{ accentColor: 'var(--primary, #7c5cbf)' }}
                    />
                    <span>{ext.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '4px' }}>
              <button
                onClick={onClose}
                className="btn-browse"
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleStartFullScan}
                className="button-primary"
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--primary, #7c5cbf)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <HardDrive size={16} /> Start Full-PC Scan
              </button>
            </div>
          </div>
        )}

        {/* State: Scanning */}
        {status === 'scanning' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={44} className="logo-icon" style={{ color: 'var(--primary, #7c5cbf)' }} />
                <HardDrive size={20} style={{ position: 'absolute', color: 'var(--text-primary)' }} />
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 6px 0' }}>
                {scanStage === 'metadata' ? 'Parsing Track Metadata...' : 'Scanning Drives for Music...'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
                {scanStage === 'metadata' ? (metadataTrackName ? `Parsing: "${metadataTrackName}"` : 'Reading metadata & ID3 tags...') : (currentDir || 'Indexing drive structures...')}
              </p>
            </div>

            {scanStage === 'metadata' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>Metadata Progress</span>
                  <span>{metadataCurrent.toLocaleString()} / {metadataTotal.toLocaleString()} tracks ({metadataTotal > 0 ? Math.round((metadataCurrent / metadataTotal) * 100) : 0}%)</span>
                </div>
                <div style={{ width: '100%', background: 'var(--bg-main)', height: '8px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div
                    style={{
                      width: `${metadataTotal > 0 ? (metadataCurrent / metadataTotal) * 100 : 0}%`,
                      background: 'var(--primary, #7c5cbf)',
                      height: '100%',
                      transition: 'width 0.2s ease'
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>{scannedFiles.toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Files Inspected</div>
                </div>
                <div style={{ background: 'rgba(124, 92, 191, 0.1)', border: '1px solid rgba(124, 92, 191, 0.3)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary, #7c5cbf)' }}>{foundCandidates.toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: 'var(--primary, #7c5cbf)', marginTop: '2px' }}>Music Candidates</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '8px' }}>
              <button
                onClick={handleCancel}
                className="btn-browse"
                style={{
                  padding: '9px 24px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel / Stop Scan
              </button>
            </div>
          </div>
        )}

        {/* State: Post-Scan Track Review Table */}
        {status === 'review' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Review &amp; Select Discovered Music ({discoveredTracks.length} Tracks)
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Uncheck any non-music audio before moving to your system Music folder.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => toggleSelectAllTracks(true)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <CheckSquare size={13} /> Select All
                </button>
                <button
                  onClick={() => toggleSelectAllTracks(false)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Square size={13} /> Deselect All
                </button>
              </div>
            </div>

            {/* Scrollable Track Table */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
              borderRadius: '10px',
              background: 'var(--bg-main, rgba(0, 0, 0, 0.15))'
            }}>
              {discoveredTracks.map((track, idx) => {
                const isSelected = selectedTrackMap[track.filePath];
                return (
                  <div
                    key={`review-${track.filePath}-${idx}`}
                    onClick={() => toggleTrackSelection(track.filePath)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.04))',
                      background: isSelected ? 'rgba(124, 92, 191, 0.08)' : 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!isSelected}
                      onChange={() => {}}
                      style={{ accentColor: 'var(--primary, #7c5cbf)', cursor: 'pointer' }}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {track.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {track.artist} • {track.album}
                      </div>
                    </div>

                    <span style={{ fontSize: '10px', background: 'rgba(124, 92, 191, 0.15)', color: 'var(--primary, #7c5cbf)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      {track.genre?.[0] || 'Music'}
                    </span>

                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '40px', textAlign: 'right' }}>
                      {formatSecs(track.duration)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Target: <strong style={{ color: 'var(--text-primary)' }}>C:\Users\...\Music</strong>
              </span>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleCancel}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
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
                  onClick={handleConfirmOrganizeSelected}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--primary, #7c5cbf)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FolderDown size={15} /> Move Selected ({Object.values(selectedTrackMap).filter(Boolean).length}) to Music Folder
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State: Organizing */}
        {status === 'organizing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
              <div style={{ padding: '14px', borderRadius: '50%', background: 'rgba(124, 92, 191, 0.15)', color: 'var(--primary, #7c5cbf)' }}>
                <Music size={32} />
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 6px 0' }}>Moving &amp; Tagging Selected Music</h3>
              <p style={{ fontSize: '12px', color: 'var(--primary, #7c5cbf)', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
                {currentTrackName ? `Moving: "${currentTrackName}"` : 'Moving files to Music folder...'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>Progress</span>
                <span>{organizeCurrent} / {organizeTotal} tracks</span>
              </div>
              <div style={{ width: '100%', background: 'var(--bg-main)', height: '8px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div
                  style={{
                    width: `${organizeTotal > 0 ? (organizeCurrent / organizeTotal) * 100 : 0}%`,
                    background: 'var(--primary, #7c5cbf)',
                    height: '100%',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '8px' }}>
              <button
                onClick={handleCancel}
                className="btn-browse"
                style={{
                  padding: '9px 24px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel / Stop Organizing
              </button>
            </div>
          </div>
        )}

        {/* State: Completed */}
        {status === 'completed' && summary && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ padding: '12px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                <CheckCircle2 size={38} />
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0' }}>Organized into System Music Folder!</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Selected music tracks have been tagged and moved into your PC Music folder.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{summary.totalCount}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Total Tracks</div>
              </div>
              <div style={{ background: 'rgba(124, 92, 191, 0.1)', border: '1px solid rgba(124, 92, 191, 0.3)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary, #7c5cbf)' }}>{summary.enrichedCount}</div>
                <div style={{ fontSize: '11px', color: 'var(--primary, #7c5cbf)', marginTop: '2px' }}>iTunes Tagged</div>
              </div>
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e' }}>{summary.successCount}</div>
                <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '2px' }}>Organized</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
              <button
                onClick={onClose}
                className="button-primary"
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--primary, #7c5cbf)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Done &amp; View Music Library
              </button>
            </div>
          </div>
        )}

        {/* State: Error */}
        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ padding: '12px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                <AlertCircle size={38} />
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 6px 0' }}>Scan Failed</h3>
              <p style={{ fontSize: '12px', color: '#ef4444', margin: 0 }}>{errorMsg}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px' }}>
              <button
                onClick={onClose}
                className="btn-browse"
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                onClick={handleStartFullScan}
                className="button-primary"
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--primary, #7c5cbf)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
