export const API_BASE = 'https://con.anisurge.me/anime/zoro';

export const ENDPOINTS = {
  RECENT: '/recent-episodes',
  TRENDING: '/top-airing', 
  POPULAR: '/most-popular',
  FAVORITE: '/most-favorite',
  LATEST_COMPLETED: '/latest-completed',
  NEW_RELEASES: '/recent-added',
  SEARCH: '/:query',
  INFO: '/info',
  ANIME_INFO: '/info',
  WATCH: '/watch/:episodeId',
  GENRE_LIST: '/genre/list',
  GENRE: '/genre/:genre',
  MOVIES: '/movies', 
  ONA: '/ona',
  OVA: '/ova',
  SPECIALS: '/specials',
  TV: '/tv'
};

// AI API Endpoints
export const AI_API = {
  OPENAI: 'https://text.pollinations.ai/openai',
  CLAUDE: '/claude/v1/messages',
  CLAUDE_BASE: 'https://text.pollinations.ai'
}; 