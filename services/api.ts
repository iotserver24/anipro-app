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
}

export interface Episode {
  id: string;  // Format: "anime-id$ep=number$token=xyz"
  number: number;
  title: string;
  isSubbed: boolean;
  isDubbed: boolean;
  url: string;
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
  private baseUrl = 'https://con.anisurge.me/anime/animekai';

  async searchAnime(query: string): Promise<AnimeResult[]> {
    const response = await fetch(`${this.baseUrl}/${query}`);
    return response.json();
  }

  async getAnimeDetails(id: string): Promise<AnimeDetails> {
    const response = await fetch(`${this.baseUrl}/info?id=${id}`);
    return response.json();
  }

  async getEpisodeSources(episodeId: string, isDub: boolean = false): Promise<StreamingResponse> {
    try {
      // Use the complete episode ID as-is, just append dub parameter if needed
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
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.RECENT}`);
    return response.json();
  }

  async getTrending(): Promise<AnimeResult[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.TRENDING}`);
    return response.json();
  }

  async getLatestCompleted(): Promise<AnimeResult[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.LATEST_COMPLETED}`);
    return response.json();
  }

  async getNewReleases(): Promise<AnimeResult[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.NEW_RELEASES}`);
    return response.json();
  }

  async getSchedule(date: string): Promise<AnimeResult[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.SCHEDULE.replace(':date', date)}`);
    return response.json();
  }

  async getGenreList(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.GENRE_LIST}`);
    return response.json();
  }

  async getAnimeByGenre(genre: string): Promise<AnimeResult[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.GENRE.replace(':genre', genre)}`);
    return response.json();
  }

  getVideoSource = this.getEpisodeSources;
}

export const animeAPI = new AnimeAPI(); 