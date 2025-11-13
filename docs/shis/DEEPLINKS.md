# AniSurge Deep Links Documentation

This document provides a comprehensive list of all deep links supported in the AniSurge app.

## Base URL Scheme
All deep links in AniSurge use the following URL scheme:
```
anisurge://
```

## Available Deep Links

### Main Navigation
- **Home Screen**
  ```
  anisurge://home
  ```

- **Notifications Screen**
  ```
  anisurge://notifications
  ```

- **My List**
  ```
  anisurge://mylist
  ```

- **Settings**
  ```
  anisurge://settings
  ```

### Content Navigation
- **Anime Details**
  ```
  anisurge://anime/{id}
  ```
  Example: `anisurge://anime/123`

- **Watch History**
  ```
  anisurge://history
  ```

- **Downloads**
  ```
  anisurge://downloads
  ```

### Search and Categories
- **Search**
  ```
  anisurge://search
  ```

- **Category**
  ```
  anisurge://category/{categoryName}
  ```
  Example: `anisurge://category/action`

### Other
- **About**
  ```
  anisurge://about
  ```

## Usage in Notifications

When creating notifications that use deep links:

1. The deep link must start with `anisurge://`
2. The link should be properly encoded if it contains special characters
3. Only use documented deep links to ensure proper navigation

Example notification with deep link:
```json
{
  "title": "New Episode Available",
  "message": "Episode 12 of Your Favorite Anime is now available!",
  "type": "update",
  "priority": "high",
  "deepLink": "anisurge://anime/123"
}
```

## Error Handling

- If an invalid deep link is provided, the app will default to the home screen
- Deep links to non-existent content (e.g., invalid anime ID) will show an error message
- Deep links requiring authentication will redirect to login if user is not authenticated

## Best Practices

1. Always test deep links before using them in notifications
2. Use appropriate deep links based on the notification context
3. Include meaningful content IDs when linking to specific items
4. Consider the user's current state when using deep links (logged in/out, etc.)

## Notes

- Deep links are case-sensitive
- Some deep links may require additional parameters
- All deep links support both development and production environments 