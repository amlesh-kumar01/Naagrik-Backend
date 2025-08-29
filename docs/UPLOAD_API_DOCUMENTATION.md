# Upload API Documentation

## Overview
The Upload API handles file uploads for the Naagrik platform, including profile images and issue media (images and videos). All uploads are processed through Cloudinary for optimized storage and delivery.

## Base URL
```
/api/upload
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Upload Profile Image
Upload a profile image for the authenticated user.

**Endpoint:** `POST /api/upload/profile-image`

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `profile` (file) - Image file (JPEG, PNG, GIF supported)

**File Constraints:**
- Max size: 100MB
- Supported formats: JPEG, PNG, GIF
- Recommended size: 400x400px (will be automatically optimized)

**Example Request:**
```javascript
const formData = new FormData();
formData.append('profile', imageFile);

const response = await fetch('/api/upload/profile-image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/naagrik/image/upload/v1693484820/naagrik/profiles/profile_user123_1693484820.jpg",
    "publicId": "naagrik/profiles/profile_user123_1693484820",
    "width": 400,
    "height": 400
  }
}
```

---

### 2. Upload Issue Media
Upload images and videos for issues.

**Endpoint:** `POST /api/upload/issue-media`

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `media` (file[]) - Multiple image/video files
- `issueId` (string, optional) - If provided, automatically saves to database

**File Constraints:**
- Max size per file: 100MB
- Max files per request: 5
- Supported image formats: JPEG, PNG, GIF
- Supported video formats: MP4, AVI, MOV
- Recommended image size: 1920x1080px
- Recommended video duration: Max 2 minutes

**Example Request (Upload Only):**
```javascript
const formData = new FormData();
formData.append('media', imageFile1);
formData.append('media', videoFile);
formData.append('media', imageFile2);

const response = await fetch('/api/upload/issue-media', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Response (Upload Only):**
```json
{
  "success": true,
  "data": [
    {
      "url": "https://res.cloudinary.com/naagrik/image/upload/v1693484820/naagrik/issues/issue_1693484820_abc123.jpg",
      "publicId": "naagrik/issues/issue_1693484820_abc123",
      "type": "image",
      "width": 1920,
      "height": 1080,
      "duration": null
    },
    {
      "url": "https://res.cloudinary.com/naagrik/video/upload/v1693484825/naagrik/issues/issue_video_1693484825_def456.mp4",
      "publicId": "naagrik/issues/issue_video_1693484825_def456",
      "type": "video",
      "width": 1280,
      "height": 720,
      "duration": 45.2
    },
    {
      "url": "https://res.cloudinary.com/naagrik/image/upload/v1693484830/naagrik/issues/issue_1693484830_ghi789.jpg",
      "publicId": "naagrik/issues/issue_1693484830_ghi789",
      "type": "image",
      "width": 1920,
      "height": 1080,
      "duration": null
    }
  ]
}
```

**Example Request (Upload + Save to Database):**
```javascript
const formData = new FormData();
formData.append('media', imageFile1);
formData.append('media', videoFile);
formData.append('issueId', '550e8400-e29b-41d4-a716-446655440000');

const response = await fetch('/api/upload/issue-media', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Response (Upload + Save):**
```json
{
  "success": true,
  "data": {
    "media": [
      {
        "url": "https://res.cloudinary.com/naagrik/image/upload/v1693484820/naagrik/issues/issue_1693484820_abc123.jpg",
        "publicId": "naagrik/issues/issue_1693484820_abc123",
        "type": "image",
        "width": 1920,
        "height": 1080,
        "duration": null
      }
    ],
    "records": [
      {
        "id": "media-uuid",
        "issue_id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "user-uuid",
        "media_url": "https://res.cloudinary.com/naagrik/image/upload/v1693484820/naagrik/issues/issue_1693484820_abc123.jpg",
        "media_type": "IMAGE",
        "is_thumbnail": true,
        "moderation_status": "APPROVED",
        "created_at": "2025-08-30T10:00:00Z"
      }
    ]
  }
}
```

---

### 3. Delete Media
Delete media from Cloudinary (and optionally from database).

**Endpoint:** `DELETE /api/upload/media`

**Request Body:**
```json
{
  "publicId": "naagrik/issues/issue_1693484820_abc123",
  "type": "image"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "result": "ok"
  }
}
```

---

### 4. Get Media Info
Retrieve information about a media file from Cloudinary.

**Endpoint:** `GET /api/upload/media/:publicId`

**Example:** `GET /api/upload/media/naagrik%2Fissues%2Fissue_1693484820_abc123`

**Response:**
```json
{
  "success": true,
  "data": {
    "publicId": "naagrik/issues/issue_1693484820_abc123",
    "url": "https://res.cloudinary.com/naagrik/image/upload/v1693484820/naagrik/issues/issue_1693484820_abc123.jpg",
    "format": "jpg",
    "resourceType": "image",
    "width": 1920,
    "height": 1080,
    "bytes": 245760,
    "createdAt": "2025-08-30T10:00:00Z"
  }
}
```

---

## Usage Workflows

### 1. Issue Creation with Media (Recommended)

```javascript
// Step 1: Upload media files first
const uploadMedia = async (files) => {
  const formData = new FormData();
  files.forEach(file => formData.append('media', file));
  
  const response = await fetch('/api/upload/issue-media', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  const result = await response.json();
  return result.data; // Array of media objects
};

// Step 2: Create issue with media URLs
const createIssue = async (issueData, mediaUrls) => {
  const response = await fetch('/api/issues', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      ...issueData,
      mediaUrls: mediaUrls
    })
  });
  
  return response.json();
};

// Usage
const files = [imageFile1, videoFile, imageFile2];
const mediaUrls = await uploadMedia(files);
const issue = await createIssue(issueData, mediaUrls);
```

### 2. Add Media to Existing Issue

```javascript
// Upload with automatic database save
const addMediaToIssue = async (issueId, files) => {
  const formData = new FormData();
  files.forEach(file => formData.append('media', file));
  formData.append('issueId', issueId);
  
  const response = await fetch('/api/upload/issue-media', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  return response.json();
};

// Usage
const result = await addMediaToIssue('issue-uuid', [newImageFile]);
```

### 3. Profile Image Update

```javascript
const updateProfileImage = async (imageFile) => {
  const formData = new FormData();
  formData.append('profile', imageFile);
  
  const response = await fetch('/api/upload/profile-image', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  const result = await response.json();
  
  // Update user profile with new image URL
  await fetch('/api/users/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      profile_image_url: result.data.url
    })
  });
  
  return result;
};
```

---

## Frontend Implementation Examples

### React/JavaScript

#### File Upload Component
```jsx
import React, { useState } from 'react';

const MediaUploader = ({ onUploadComplete, issueId = null }) => {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(selectedFiles);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('media', file));
      
      if (issueId) {
        formData.append('issueId', issueId);
      }

      const response = await fetch('/api/upload/issue-media', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        onUploadComplete(result.data);
        setFiles([]);
      } else {
        console.error('Upload failed:', result.message);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="media-uploader">
      <input
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      
      {files.length > 0 && (
        <div className="file-preview">
          <p>{files.length} file(s) selected</p>
          <button onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MediaUploader;
```

#### Profile Image Uploader
```jsx
const ProfileImageUploader = ({ currentImageUrl, onImageUpdate }) => {
  const [uploading, setUploading] = useState(false);

  const handleImageSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profile', file);

      const response = await fetch('/api/upload/profile-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        onImageUpdate(result.data.url);
      }
    } catch (error) {
      console.error('Profile image upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="profile-image-uploader">
      <img 
        src={currentImageUrl || '/default-avatar.png'} 
        alt="Profile" 
        className="profile-image"
      />
      <input
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
};
```

---

## Error Handling

### Common Error Responses

#### File Too Large
```json
{
  "success": false,
  "message": "Media upload failed",
  "error": "File size exceeds 100MB limit"
}
```

#### Invalid File Type
```json
{
  "success": false,
  "message": "Only image and video files are allowed"
}
```

#### No File Provided
```json
{
  "success": false,
  "message": "No file uploaded"
}
```

#### Invalid Image File
```json
{
  "success": false,
  "message": "Invalid image file"
}
```

#### Cloudinary Upload Failed
```json
{
  "success": false,
  "message": "Media upload failed",
  "error": "Cloudinary upload error: Invalid image file"
}
```

---

## File Processing Details

### Image Processing
- **Automatic optimization** for web delivery
- **Multiple format generation** (WebP, JPEG, PNG)
- **Responsive sizing** for different screen sizes
- **Quality optimization** based on content

### Video Processing
- **Automatic format conversion** for web compatibility
- **Thumbnail generation** from first frame
- **Quality optimization** for streaming
- **Duration and metadata extraction**

### Storage Organization
```
naagrik/
├── profiles/
│   └── profile_{userId}_{timestamp}.jpg
└── issues/
    ├── issue_{timestamp}_{random}.jpg
    └── issue_video_{timestamp}_{random}.mp4
```

---

## Security Features

1. **File Type Validation** - Only images and videos allowed
2. **Size Limits** - 100MB per file maximum
3. **Authentication Required** - All uploads require valid JWT
4. **No Temporary Storage** - Files uploaded directly to cloud from memory
5. **Moderation Ready** - All uploads can be flagged for review

---

## Rate Limiting

- **Profile Images**: 5 uploads per hour per user
- **Issue Media**: 20 uploads per hour per user
- **File Deletion**: 10 deletions per hour per user

---

## Best Practices

### For Developers
1. **Always handle upload progress** for better UX
2. **Validate files client-side** before uploading
3. **Show preview** of selected files
4. **Implement retry logic** for failed uploads
5. **Clean up file inputs** after successful uploads

### For Users
1. **Use high-quality images** for better issue documentation
2. **Keep videos under 2 minutes** for faster upload
3. **Compress large files** before uploading
4. **Use descriptive filenames** for better organization

### File Size Recommendations
- **Profile Images**: 400x400px, < 1MB
- **Issue Images**: 1920x1080px, < 5MB
- **Issue Videos**: 1280x720px, < 50MB, < 2 minutes

---

## Integration with Issues API

The Upload API is designed to work seamlessly with the Issues API:

1. **Upload media files** using Upload API
2. **Receive Cloudinary URLs** in response
3. **Include URLs in issue creation** via Issues API
4. **First uploaded media** automatically becomes thumbnail
5. **All media linked** to the issue in database
