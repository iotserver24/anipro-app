# AniSurge Share Image Generator

The share image generator creates beautiful, dynamic share images for anime content using Next.js and @vercel/og. These images are perfect for social media sharing, meta tags, and other promotional purposes.

## Usage

### API Endpoint

```typescript
GET https://anisurge.me/api/generate-share
```

### Query Parameters

- `animeName` (string): The name of the anime
- `coverImageUrl` (string): URL of the anime cover image
- `genres` (string): Comma-separated list of genres
- `returnUrl` (boolean): If true, returns a catbox.moe URL instead of the image binary

### Response Types

1. When `returnUrl=false` (default):
   - Returns the image binary (image/png)
   - Status: 200 OK

2. When `returnUrl=true`:
   ```json
   {
     "url": "https://files.catbox.moe/xxxxx.png"
   }
   ```

### Example URLs

```
# Get image binary
https://anisurge.me/api/generate-share?animeName=ONE%20PIECE&coverImageUrl=https://example.com/cover.jpg&genres=Action,%20Adventure,%20Fantasy

# Get catbox.moe URL
https://anisurge.me/api/generate-share?animeName=ONE%20PIECE&coverImageUrl=https://example.com/cover.jpg&genres=Action,%20Adventure,%20Fantasy&returnUrl=true
```

### Using cURL (Bash/Linux/Mac)

```bash
# Get image binary
curl -X GET "https://anisurge.me/api/generate-share?animeName=ONE%20PIECE&coverImageUrl=https://example.com/cover.jpg&genres=Action,%20Adventure,%20Fantasy" \
-o share_image.png

# Get catbox.moe URL
curl -X GET "https://anisurge.me/api/generate-share?animeName=ONE%20PIECE&coverImageUrl=https://example.com/cover.jpg&genres=Action,%20Adventure,%20Fantasy&returnUrl=true" \
-H "Accept: application/json"

# Example Response:
# {
#   "url": "https://files.catbox.moe/xxxxx.png"
# }
```

### Using PowerShell (Windows)

```powershell
# Get image binary
Invoke-WebRequest -Uri "https://anisurge.me/api/generate-share?animeName=ONE%20PIECE&coverImageUrl=https://example.com/cover.jpg&genres=Action,%20Adventure,%20Fantasy" -OutFile share_image.png

# Get catbox.moe URL
$response = Invoke-WebRequest -Uri "https://anisurge.me/api/generate-share?animeName=ONE%20PIECE&coverImageUrl=https://example.com/cover.jpg&genres=Action,%20Adventure,%20Fantasy&returnUrl=true" -Headers @{Accept="application/json"}
$content = $response.Content | ConvertFrom-Json
$imageUrl = $content.url

# Example Response:
# {
#   "url": "https://files.catbox.moe/xxxxx.png"
# }
```

### Integration Examples

#### Next.js Integration

```typescript
// In your Next.js page or component
const ShareImage = ({ anime }) => {
  // For meta tags, use direct image
  const baseUrl = 'https://anisurge.me';
  const shareImageUrl = `${baseUrl}/api/generate-share?` + 
    `animeName=${encodeURIComponent(anime.title)}` +
    `&coverImageUrl=${encodeURIComponent(anime.coverImage)}` +
    `&genres=${encodeURIComponent(anime.genres.join(', '))}`;

  return (
    <head>
      <meta property="og:image" content={shareImageUrl} />
      <meta name="twitter:image" content={shareImageUrl} />
    </head>
  );
};
```

#### Expo/React Native Integration

```typescript
import * as Share from 'expo-sharing';

// Function to generate share image URL
const generateShareImage = async (animeName, coverImageUrl, genres) => {
  try {
    const encodedName = encodeURIComponent(animeName);
    const encodedUrl = encodeURIComponent(coverImageUrl);
    const encodedGenres = encodeURIComponent(genres);
    
    const response = await fetch(
      `https://anisurge.me/api/generate-share?animeName=${encodedName}&coverImageUrl=${encodedUrl}&genres=${encodedGenres}&returnUrl=true`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.url; // Returns the catbox.moe URL
  } catch (error) {
    console.error('Error generating share image:', error);
    throw error;
  }
};

// Share button handler
const handleShare = async (anime) => {
  try {
    // Get the catbox.moe URL
    const imageUrl = await generateShareImage(
      anime.title,
      anime.coverImage,
      anime.genres.join(', ')
    );

    // Share using Expo's share API with the direct URL
    await Share.share({
      title: `Check out ${anime.title}!`,
      url: imageUrl, // Direct catbox.moe URL
    });
  } catch (error) {
    console.error('Error sharing:', error);
    // Handle error appropriately
  }
};

// Usage in your component
const ShareButton = ({ anime }) => {
  return (
    <Button 
      title="Share" 
      onPress={() => handleShare(anime)}
    />
  );
};
```

## Features

- Dynamic 4-panel grid layout showing different parts of the cover image
- Beautiful background with gradient effects
- Elegant typography with anime title and genres
- Optimized for social media sharing (1200x630 pixels)
- Responsive design that works across different platforms
- Automatic upload to catbox.moe for permanent storage

## Technical Details

- Built with Next.js and @vercel/og
- Uses Edge Runtime for optimal performance
- Supports dynamic text and image content
- Handles error cases gracefully
- Optimized image quality and loading
- Mobile-friendly with Expo/React Native support
- Integration with catbox.moe for image hosting

## Requirements

1. **Image Access**: The cover image URL must be publicly accessible
2. **URL Encoding**: All parameters must be properly URL encoded
3. **Response Format**: Returns either PNG image or JSON with catbox.moe URL
4. **Mobile Integration**: For Expo apps, ensure you have `expo-sharing` installed

## Best Practices

1. **Image Quality**: Provide high-resolution cover images (recommended minimum: 800x600 pixels)
2. **Text Length**: Keep anime titles reasonably short for optimal display
3. **Genres**: Limit to 3-4 main genres for best appearance
4. **Cache Control**: Consider using the catbox.moe URL for better caching
5. **URL Format**: Ensure proper URL encoding
6. **Error Handling**: Implement fallback for failed image generation
7. **Mobile Handling**: Use `returnUrl=true` for mobile sharing

## Error Handling

The API returns:
- 200: Successful image generation (PNG or JSON with URL)
- 400: Missing required parameters
- 500: Failed to generate image or upload to catbox.moe

Error Response Format (when returnUrl=true):
```json
{
  "error": "Error message here"
}
```

## Example Response

1. Binary image/png (1200x630 pixels) when returnUrl=false
2. JSON with catbox.moe URL when returnUrl=true

## Troubleshooting

1. **Network Error**: Check your internet connection and API endpoint accessibility
2. **Failed to Generate**: Check if the cover image URL is accessible
3. **Invalid Image**: Ensure the cover image is in a supported format (PNG/JPEG)
4. **Upload Failed**: Verify catbox.moe service status if URL return fails
5. **Mobile Issues**: Ensure proper permissions are set for sharing in your Expo app

## Notes

- The share image is generated on-demand
- Images are automatically uploaded to catbox.moe when requested
- All text is automatically styled and positioned
- Images are automatically cropped and positioned in the 4-panel grid
- The design is optimized for social media sharing
- Works seamlessly with both web and mobile applications 