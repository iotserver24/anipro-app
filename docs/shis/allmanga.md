## AniSurge AM API

Public API hosted at `https://anisurge.me` for mapping AniList IDs to provider IDs, listing episodes, and scraping stream links.

### Base
- **Base URL**: `https://anisurge.me`
- **Endpoint**: `GET /api/am`
- **Auth**: none
- **CORS**: public
- **Mode**: `sub` (default) or `dub` via `mode` query

### Endpoints

#### map — Resolve AniList ID to providerId
- Request: `GET /api/am?action=map&anilistId={number}&mode={sub|dub}`
- Success 200:
```json
{ "providerId": "SHOW_ID_STRING" }
```
- Not found 404:
```json
{ "notFound": true }
```
- Errors 400/500:
```json
{ "error": "message" }
```

#### episodes — List episodes for a providerId
- Request: `GET /api/am?action=episodes&providerId={string}&mode={sub|dub}`
- Success 200:
```json
{
  "episodes": [
    { "id": "SHOW_ID|1", "episode_number": 1 },
    { "id": "SHOW_ID|2", "episode_number": 2 }
  ]
}
```
- Not found 404:
```json
{ "notFound": true }
```

#### scrape — Get sorted stream links for an episode
- Request: `GET /api/am?action=scrape&episodeId={SHOW_ID|EPISODE_STRING}&mode={sub|dub}`
- Success 200:
```json
{
  "streams": [
    { "url": "https://…/1080p.m3u8", "quality": "1080p", "headers": { "Referer": "https://allmanga.to/" } },
    { "url": "https://…/720p.m3u8", "quality": "720p", "headers": { "Referer": "https://allmanga.to/" } }
  ]
}
```
- Not found 404:
```json
{ "notFound": true, "message": "…" }
```
- Error 500:
```json
{ "error": true, "message": "…" }
```

### Typical Flow
1. Map AniList ID → providerId
2. Fetch episodes for `providerId`
3. Scrape streams for chosen `episodeId` (format: `SHOW_ID|EPISODE_STRING`)

### Quick Examples

```bash
# 1) Map AniList ID 19 to providerId
curl "https://anisurge.me/api/am?action=map&anilistId=19"

# 2) Get episodes for that provider (replace <SHOW_ID> with value from step 1)
curl "https://anisurge.me/api/am?action=episodes&providerId=<SHOW_ID>"

# 3) Scrape streams for the first episode
curl "https://anisurge.me/api/am?action=scrape&episodeId=<SHOW_ID>|1"
```

### Client Usage Example (JS)

```javascript
const base = 'https://anisurge.me/api/am';

// 1) map
const mapRes = await fetch(`${base}?action=map&anilistId=19`);
const { providerId } = await mapRes.json();

// 2) episodes
const epRes = await fetch(`${base}?action=episodes&providerId=${encodeURIComponent(providerId)}`);
const { episodes } = await epRes.json();

// 3) scrape
const firstId = episodes[0].id; // e.g., "SHOW_ID|1"
const scRes = await fetch(`${base}?action=scrape&episodeId=${encodeURIComponent(firstId)}`);
const { streams } = await scRes.json();
```


