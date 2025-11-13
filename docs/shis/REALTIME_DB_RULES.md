# Firebase Realtime Database Rules Documentation

## Public Chat Rules

The database rules are designed to secure the public chat feature while ensuring proper data validation and access control.

### Base Access Rules
- **Read Access**: Only authenticated users can read messages
- **Write Access**: Only authenticated users can write messages
- **Indexing**: Messages are indexed by timestamp for efficient querying

### Message Structure Validation
Each message must have these required fields:
- `userId`: The ID of the user who sent the message
- `userName`: The display name of the user
- `content`: The actual message text
- `timestamp`: When the message was sent

### Field-Specific Rules

#### User ID
- Must match the authenticated user's ID
- Prevents user impersonation

#### Username
- Must be a string
- Length: 1-50 characters
- Cannot be empty

#### Message Content
- Must be a string
- Length: 1-500 characters
- Cannot be empty

#### Timestamp
- Must be either:
  - A valid number
  - The server timestamp (`now`)

#### User Avatar
- Optional field
- If present:
  - Must be a string (URL)
  - Maximum length: 500 characters

### Message Deletion
- Users can only delete their own messages
- Verified by checking if the message's userId matches the authenticated user's ID

### Security
- All other database paths are locked down
- No access to paths outside of `public_chat`

## How to Apply

1. Go to Firebase Console
2. Navigate to Realtime Database
3. Select "Rules" tab
4. Copy the contents of `database.rules.json`
5. Click "Publish"

## Database URL

Make sure to use the correct database URL for the Asia Southeast 1 region:
```
https://anisurge-11808-default-rtdb.asia-southeast1.firebasedatabase.app
``` 