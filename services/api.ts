import { API_BASE, ENDPOINTS } from '../constants/api';

// Search result interface based on Zoro schema
export interface AnimeResult {
  id: string;
  title: string;
  url: string;
  image: string;
  japaneseTitle: string;
  type: string;
  sub: number;
  dub: number;
  episodes: number;
}

// Anime details interface based on Zoro schema
export interface AnimeDetails {
  id: string;
  title: string;
  japaneseTitle: string;
  image: string;
  description: string;
  type: string;
  url: string;
  subOrDub: 'sub' | 'dub' | 'both';
  hasSub: boolean;
  hasDub: boolean;
  genres: string[];
  status: string;
  season: string;
  totalEpisodes: number;
  episodes: Episode[];
  rating?: string;
  recommendations?: {
    id: string;
    title: string;
    image: string;
    type: string;
    episodes: number;
  }[];
  relations?: {
    id: string;
    title: string;
    image: string;
    type: string;
    episodes: number;
    relationType: string;
  }[];
}

export interface Episode {
  id: string;  // Format: "anime-id$ep=number$token=xyz"
  number: number;
  title: string;
  isSubbed: boolean;
  isDubbed: boolean;
  url: string;
  isFiller?: boolean;
}

// Streaming source interface based on Zoro schema
export interface StreamingResponse {
  headers: {
    Referer: string;
  };
  sources: {
    url: string;
    isM3U8: boolean;
  }[];
  subtitles?: {
    kind: string;
    url: string;
  }[];
  download?: string;
  intro?: {
    start: number;
    end: number;
  };
  outro?: {
    start: number;
    end: number;
  };
}

class AnimeAPI {
  private baseUrl = 'https://con.anisurge.me/anime/zoro';

  async searchAnime(query: string): Promise<AnimeResult[]> {
    const response = await fetch(`${this.baseUrl}/${query}`);
    const data = await response.json();
    return Array.isArray(data) ? data : data.results || [];
  }

  async getAnimeDetails(id: string): Promise<AnimeDetails> {
    const response = await fetch(`${this.baseUrl}/info?id=${id}`);
    const data = await response.json();
    return data;
  }

  async getEpisodeSources(episodeId: string, isDub: boolean = false): Promise<StreamingResponse> {
    try {
      const url = `${this.baseUrl}/watch/${episodeId}${isDub ? '?dub=true' : ''}`;
      console.log('Fetching sources from:', url);
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching episode sources:', error);
      throw error;
    }
  }

  async getRecentAnime(): Promise<AnimeResult[]> {
    const response = await fetch(`${this.baseUrl}/recent-episodes`);
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[getRecentAnime] Non-JSON response:', text.slice(0, 200));
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : data.results || [];
  }

  async getTrending(): Promise<AnimeResult[]> {
    const response = await fetch(`${this.baseUrl}/top-airing`);
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[getTrending] Non-JSON response:', text.slice(0, 200));
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : data.results || [];
  }

  async getLatestCompleted(): Promise<AnimeResult[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.LATEST_COMPLETED}`);
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[getLatestCompleted] Non-JSON response:', text.slice(0, 200));
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : data.results || [];
  }

  async getNewReleases(): Promise<AnimeResult[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.NEW_RELEASES}`);
    const data = await response.json();
    return Array.isArray(data) ? data : data.results || [];
  }

  async getGenreList(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/genre/list`);
    const data = await response.json();
    return Array.isArray(data) ? data : data.results || [];
  }

  async getAnimeByGenre(genre: string): Promise<AnimeResult[]> {
    const response = await fetch(`${this.baseUrl}/genre/${genre}`);
    const data = await response.json();
    return Array.isArray(data) ? data : data.results || [];
  }

  async getPopularAnime(): Promise<AnimeResult[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.POPULAR}`);
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[getPopularAnime] Non-JSON response:', text.slice(0, 200));
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : data.results || [];
  }

  async getFavoriteAnime(): Promise<AnimeResult[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.FAVORITE}`);
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[getFavoriteAnime] Non-JSON response:', text.slice(0, 200));
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : data.results || [];
  }

  getVideoSource = this.getEpisodeSources;
}

export const animeAPI = new AnimeAPI(); 