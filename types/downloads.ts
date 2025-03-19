export type DownloadStatus = {
  [key: string]: {
    progress: number;
    status: 'idle' | 'downloading' | 'completed' | 'error';
  };
}; 