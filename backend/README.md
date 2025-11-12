# Sri Lanka Hindu Temples API

A Node.js API for managing Hindu temples data in Sri Lanka, built with Express.js and MongoDB.

## Features

- Temple data management
- Photo upload to GitHub repository
- Photo upload to Azure Blob Storage (presigned URLs)
- Comment system for temples
- Suggested name submissions

## API Endpoints

### Temple Data
- `GET /api/temples_initial.ts` - Get first 5 temples
- `GET /api/temples_search.ts` - Search temples by geographic bounds
- `GET /api/temples_search_by_name.ts` - Search temples by name

### Photo Upload
- `POST /api/upload_temple_photo.ts` - Upload photo directly to GitHub repository
- `POST /api/upload_temple_photo_azure.ts` - Generate presigned URL for Azure Blob Storage upload

### Comments & Suggestions
- `POST /api/add_temple_comment.ts` - Add comment to temple
- `POST /api/add_suggested_temple_name.ts` - Add suggested name to temple

### Health Check
- `GET /health` - API health check

## Azure Blob Storage Upload

The Azure upload endpoint generates a presigned URL that allows direct upload to Azure Blob Storage without exposing storage credentials.

### Request
```json
POST /api/upload_temple_photo_azure.ts
{
  "templeId": "507f1f77bcf86cd799439011",
  "fileType": "image/jpeg"
}
```

### Response
```json
{
  "ok": true,
  "presignedUrl": "https://yourstorage.blob.core.windows.net/temple-photos/temple_name/1699123456789-abc123.jpg?sv=...",
  "blobName": "temple_name/1699123456789-abc123.jpg",
  "container": "temple-photos",
  "templeName": "Temple Name",
  "fileName": "1699123456789-abc123.jpg"
}
```

### Usage
1. Call the API to get a presigned URL
2. Use the presigned URL to upload the file directly to Azure Blob Storage
3. The file will be stored in a folder named after the temple (slugified)

## Environment Variables

Create a `.env` file with the following variables:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=temples
MONGODB_COLLECTION=temples

# GitHub (for direct upload)
GITHUB_TOKEN=your_github_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_photos_repo
GITHUB_BRANCH=main
GITHUB_IMAGES_DIR=temple_photos

# Azure Blob Storage (for presigned URL upload)
AZURE_STORAGE_CONNECTION_STRING=your_azure_connection_string
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account
AZURE_STORAGE_ACCOUNT_KEY=your_storage_key
AZURE_STORAGE_CONTAINER=temple-photos

# Other
PORT=8080
```

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env`
4. Build the project: `npm run build`
5. Start development server: `npm run dev`
6. Or start production server: `npm start`

## Deployment

This API is designed to work with Vercel serverless functions. Deploy by connecting your GitHub repository to Vercel.

## License

MIT
