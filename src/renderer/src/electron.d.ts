export {};

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      getWindowState: () => Promise<{ isMaximized: boolean }>;
      scanLibrary: (sourceFolder: string) => Promise<any[]>;
      organizeLibrary: (tracks: any[]) => Promise<any>;
      reorganizeFolders: () => Promise<any>;
      getGenreFolders: (forceRefresh?: boolean) => Promise<any[]>;
      getThemeSync: () => string;
      getSettings: () => Promise<any>;
      saveSettings: (settings: any) => Promise<any>;
      testDiscordRpc: (clientId: string) => Promise<any>;
      openExternal: (url: string) => Promise<boolean>;
      getLikedTracks: () => Promise<string[]>;
      saveLikedTracks: (likedTracks: string[]) => Promise<boolean>;
      selectFolder: () => Promise<string | null>;
      getLibrary: () => Promise<any[]>;
      saveLibrary: (tracks: any[]) => Promise<boolean>;
      getActivities: () => Promise<any[]>;
      getPlaylists: () => Promise<any[]>;
      savePlaylists: (playlists: any[]) => Promise<boolean>;
      deleteFile: (filePath: string) => Promise<boolean>;
      playTrack: (filePath: string) => Promise<string>;
      getLyrics: (filePath: string) => Promise<any>;
      onWindowStateChanged: (callback: (state: { isMaximized: boolean }) => void) => () => void;
      onOrganizeProgress: (callback: (progress: { current: number; total: number }) => void) => () => void;
      deleteSourceFiles: (filePaths: string[]) => Promise<any>;
      clearLibraryCache: () => Promise<boolean>;
      resetSettings: () => Promise<boolean>;
      deleteOrganizedMusic: () => Promise<boolean>;
      updatePlaybackState: (isPlaying: boolean, track?: any) => Promise<boolean>;
      onThumbarControl: (callback: (action: string) => void) => () => void;
      showInExplorer: (filePath: string) => Promise<boolean>;
      applyVisualStyle: (style: string) => Promise<boolean>;
      getSystemInfo: () => Promise<any>;
      onVisualStyleChanged: (callback: (style: string) => void) => () => void;
      writeTrackMetadata: (filePath: string, tags: object) => Promise<any>;
      restartApp: () => void;
      onUpdateStatus: (cb: (event: any, message: string) => void) => void;
      renameFolder: (oldPath: string, newPath: string) => Promise<boolean>;
      getSystemDrives: () => Promise<string[]>;
      cancelScan: () => Promise<boolean>;
      scanAllDrives: (targetRoots?: string[]) => Promise<any[]>;
      onScanAllDrivesProgress: (callback: (progress: any) => void) => () => void;
      autoOrganizeAllMusic: (tracks: any[]) => Promise<any>;
      onAutoOrganizeProgress: (callback: (progress: any) => void) => () => void;
      searchOnlineMusic: (term: string) => Promise<any[]>;
      downloadOnlineTrack: (track: any) => Promise<any>;
    };
  }
}
