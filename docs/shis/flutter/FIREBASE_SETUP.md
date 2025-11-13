# Firebase Setup Guide for AniSurge Flutter

## Prerequisites
1. Firebase account (https://firebase.google.com)
2. FlutterFire CLI installed: `dart pub global activate flutterfire_cli`

## Setup Steps

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name: "AniSurge" (or your preferred name)
4. Follow the setup wizard

### 2. Configure Firebase for Flutter

Run the FlutterFire CLI command:
```bash
flutterfire configure
```

This will:
- Detect your Flutter apps
- Create/update `firebase_options.dart` file
- Configure Firebase for all platforms

### 3. Platform-Specific Setup

#### Android
1. Download `google-services.json` from Firebase Console
2. Place it in `android/app/` directory
3. Ensure `android/build.gradle` includes:
   ```gradle
   dependencies {
       classpath 'com.google.gms:google-services:4.4.0'
   }
   ```
4. Ensure `android/app/build.gradle` includes:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```

#### iOS
1. Download `GoogleService-Info.plist` from Firebase Console
2. Add it to `ios/Runner/` in Xcode
3. Ensure CocoaPods is installed: `sudo gem install cocoapods`
4. Run: `cd ios && pod install`

#### Web
1. Firebase will be configured automatically via `firebase_options.dart`

### 4. Enable Firebase Services

In Firebase Console, enable:
- **Authentication**: Email/Password provider
- **Firestore Database**: Create database in test mode (update rules later)
- **Realtime Database**: Create database in test mode (update rules later)

### 5. Firestore Security Rules

Update Firestore rules in Firebase Console:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /comments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    match /comment_likes/{likeId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 6. Realtime Database Rules

Update Realtime Database rules:
```json
{
  "rules": {
    "publicChat": {
      ".read": true,
      ".write": "auth != null"
    },
    "rateLimits": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### 7. Environment Variables (Optional)

Create a `.env` file in the project root:
```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
```

## Testing Firebase Connection

After setup, run the app:
```bash
flutter run
```

The app will initialize Firebase automatically. Check console logs for any errors.

## Troubleshooting

### Firebase not initializing
- Check `firebase_options.dart` exists
- Verify platform-specific config files are in place
- Check console logs for specific errors

### Authentication not working
- Ensure Email/Password provider is enabled in Firebase Console
- Check Firestore rules allow user creation
- Verify `google-services.json` / `GoogleService-Info.plist` are correct

### Firestore errors
- Check security rules
- Verify collection names match code (`users`, `comments`, `comment_likes`)

## Next Steps

After Firebase is configured:
1. Test authentication (sign up/sign in)
2. Test comments system
3. Test watch history sync (when implemented)
4. Set up proper security rules for production

