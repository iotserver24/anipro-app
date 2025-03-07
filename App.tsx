// Delete this file - it's not needed with Expo Router

import { useEffect } from 'react';
import { useWatchHistoryStore } from './store/watchHistoryStore';

export default function App() {
  const initializeHistory = useWatchHistoryStore(state => state.initializeHistory);

  useEffect(() => {
    initializeHistory();
  }, []);

  // ... rest of your App component
}
