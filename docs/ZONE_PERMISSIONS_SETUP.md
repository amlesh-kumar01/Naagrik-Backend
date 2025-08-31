# Zone-Based Steward Permissions & Database Setup

## Overview

This documentation covers the newly implemented zone-based permissions system for stewards and the comprehensive database seeding solution with realistic IIT Kharagpur area data.

## 🎯 Features Implemented

### 1. Zone-Based Steward Permissions
- **Zone Access Control**: Stewards can only manage issues within their assigned zones
- **Automatic Validation**: Middleware checks zone access for all steward operations
- **Bulk Operation Protection**: Zone validation applies to bulk status updates
- **Clear Error Messages**: Detailed feedback when access is denied

### 2. Comprehensive Database Seeding
- **Realistic Location Data**: IIT Kharagpur and surrounding areas (15km radius)
- **Zone-Based Assignment**: Stewards assigned to specific geographical zones
- **Real Image Integration**: Downloads and uploads actual civic issue images
- **Fallback System**: Graceful degradation to placeholder images

### 3. Image Management System
- **Real Image Downloads**: Downloads relevant civic issue images from Unsplash
- **Cloudinary Integration**: Uploads to cloud storage with proper categorization
- **Category-Based Images**: Different image sets for each issue category
- **Error Handling**: Comprehensive retry logic and fallback mechanisms

## 🗺️ Zone Structure

### Zone Definitions (IIT Kharagpur Area)
```
1. IIT Campus Core (22.3149, 87.3105) - 2km radius
2. Technology Market (22.3155, 87.3095) - 1.5km radius  
3. Railway Station Area (22.3198, 87.3155) - 2km radius
4. Medical College Area (22.3195, 87.3165) - 1.5km radius
5. Hijli Cooperative (22.3125, 87.3085) - 1km radius
6. Student Housing Zone (22.3175, 87.3125) - 1.5km radius
7. Market Complex (22.3165, 87.3135) - 1km radius
8. Hospital Zone (22.3185, 87.3145) - 1km radius
```

### Steward Assignments
Each steward is assigned to 1-2 zones to ensure proper coverage and manageable workload.

## 🔐 Permission Matrix

| Role | Create Issues | Update Status | Delete Issues | Manage Zones | Zone Restrictions |
|------|---------------|---------------|---------------|--------------|-------------------|
| **USER** | ✅ (any location) | ❌ | ✅ (own only) | ❌ | None |
| **STEWARD** | ✅ (any location) | ✅ (assigned zones) | ✅ (own + zone issues) | ❌ | Zone-based |
| **ADMIN** | ✅ (any location) | ✅ (all zones) | ✅ (all) | ✅ | None |

## 📚 API Changes

### New Middleware: `checkStewardZoneAccess`

Applied to routes that stewards use to manage issues:
- `PUT /api/issues/:id/status` - Update issue status
- `POST /api/issues/:id/mark-duplicate` - Mark as duplicate
- `PUT /api/issues/bulk/status` - Bulk status updates (with per-issue validation)

### Response Format for Zone Access Denial
```json
{
  "success": false,
  "error": "Access denied: You are not authorized to manage issues in this zone",
  "details": {
    "message": "Stewards can only manage issues within their assigned zones",
    "assignedZones": "IIT Campus Core, Technology Market",
    "requestedAction": "PUT /api/issues/123/status"
  }
}
```

## 🗃️ Database Schema Updates

### New Table: `steward_zones`
```sql
CREATE TABLE steward_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  steward_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  UNIQUE(steward_id, zone_id)
);
```

### Updated Tables
- **zones**: Added PostGIS spatial boundaries for geographical calculations
- **issues**: Spatial indexing for efficient zone-based queries
- **issue_media**: Enhanced with AI tags and moderation status

## 🚀 Setup Scripts

### Master Setup Script
```bash
# Full setup with placeholder images (default)
npm run setup

# Full setup with real images from Cloudinary
npm run setup:real-images

# Only reset database (no seeding)
npm run setup:clean

# Only seed data (don't reset)
npm run setup:seed-only
```

### Individual Scripts
```bash
# Database reset and basic seeding
npm run reset

# Image seeding only (placeholder)
npm run seed:images

# Image seeding with real images
npm run seed:images:real
```

## 🖼️ Image Seeding System

### Image Categories
- **Roads & Transportation**: Potholes, traffic issues, road damage
- **Water & Sewerage**: Flooding, drainage, pipe issues  
- **Electricity**: Street lights, power outages, electrical problems
- **Waste Management**: Garbage, overflowing bins, littering
- **Public Safety**: Security issues, unsafe areas
- **Infrastructure**: Building damage, construction issues
- **Environment**: Pollution, environmental damage
- **Healthcare**: Medical facility issues

### Image Sources
- **Real Images**: Curated from Unsplash with relevant civic issue imagery
- **Placeholder Images**: Dynamically generated with category-specific colors
- **Fallback System**: Automatic fallback if real image download/upload fails

### Image Processing Flow
1. **Download**: Fetch images from external URLs with retry logic
2. **Upload**: Send to Cloudinary with proper folder organization
3. **Database**: Store media records with AI tags and metadata
4. **Cleanup**: Remove temporary files after processing
5. **Assignment**: Randomly assign 1-3 images per issue

## 🧪 Test Data Characteristics

### Realistic IIT Kharagpur Data
- **Users**: Mix of students, faculty, staff, and local residents
- **Issues**: Campus-specific problems (hostel issues, academic areas, local infrastructure)
- **Addresses**: Real locations around IIT Kharagpur campus
- **Timing**: Issues distributed over last 60 days with realistic patterns
- **Severity**: Appropriate priority levels based on issue types

### Sample Issues Created
- Pothole near IIT Main Gate
- Broken street light in Technology Market
- Drainage issue in Hijli Cooperative
- Hostel water supply problems
- Campus road maintenance needs
- Local market sanitation issues

## 🔧 Configuration

### Required Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/naagrik

# Redis (for caching and rate limiting)
REDIS_URL=redis://localhost:6379

# Cloudinary (for real images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT
JWT_SECRET=your_jwt_secret

# App
NODE_ENV=development
PORT=3000
```

### Optional Configuration
```env
# Image seeding behavior
FORCE_REAL_IMAGES=true          # Force real images even if Cloudinary not fully configured
MAX_IMAGE_DOWNLOAD_RETRIES=3    # Number of retries for image downloads
IMAGE_UPLOAD_TIMEOUT=30000      # Timeout for image uploads (ms)
```

## 🛠️ Development Workflow

### Initial Setup
1. **Install Dependencies**: `npm install`
2. **Configure Environment**: Copy `.env.example` to `.env` and fill in values
3. **Setup Database**: `npm run setup` (includes images)
4. **Start Development**: `npm run dev`

### Testing Zone Permissions
1. **Login as Steward**: Use one of the seeded steward accounts
2. **Try Managing Issues**: Attempt to update issues in different zones
3. **Verify Restrictions**: Confirm access denied for issues outside assigned zones
4. **Test Bulk Operations**: Try bulk updates with mixed zone issues

### Resetting for Fresh Testing
```bash
# Quick reset with existing data structure
npm run setup:clean

# Full reset with new data
npm run setup

# Reset with real images (if Cloudinary configured)
npm run setup:real-images
```

## 📊 Monitoring & Debugging

### Checking Zone Assignments
```sql
-- View steward zone assignments
SELECT 
  u.full_name as steward_name,
  z.name as zone_name,
  z.type as zone_type,
  sz.assigned_at,
  sz.is_active
FROM steward_zones sz
JOIN users u ON sz.steward_id = u.id
JOIN zones z ON sz.zone_id = z.id
WHERE sz.is_active = true
ORDER BY u.full_name, z.name;
```

### Checking Issue-Zone Relationships
```sql
-- View issues with their zones
SELECT 
  i.title,
  i.status,
  u.full_name as reporter,
  z.name as zone_name,
  ST_Distance(
    ST_Point(i.longitude, i.latitude),
    ST_Centroid(z.boundary)
  ) as distance_from_zone_center
FROM issues i
LEFT JOIN zones z ON ST_Contains(z.boundary, ST_Point(i.longitude, i.latitude))
LEFT JOIN users u ON i.user_id = u.id
ORDER BY i.created_at DESC;
```

### Common Debugging Commands
```bash
# Check seeding logs
npm run setup 2>&1 | tee setup.log

# Test image seeding separately
npm run seed:images

# Verify database structure
psql $DATABASE_URL -c "\dt"

# Check zone data
psql $DATABASE_URL -c "SELECT name, type, ST_AsText(ST_Centroid(boundary)) FROM zones;"
```

## ⚠️ Important Notes

### Zone Access Enforcement
- **Middleware Level**: Zone access is enforced at the middleware level before reaching controllers
- **Database Level**: Additional checks in service methods for data integrity
- **Bulk Operations**: Each issue in bulk operations is individually validated
- **Error Reporting**: Clear feedback about which issues are inaccessible

### Image Seeding Considerations
- **Rate Limiting**: Built-in delays between image downloads to respect source servers
- **Storage Management**: Temporary files are cleaned up after processing
- **Error Recovery**: Graceful fallback to placeholder images if downloads fail
- **Cloudinary Costs**: Real image uploads count toward Cloudinary usage limits

### Performance Considerations
- **Spatial Indexing**: PostGIS spatial indexes for efficient zone queries
- **Cache Integration**: Zone access results can be cached for frequently accessed zones
- **Batch Processing**: Bulk operations optimized for large data sets
- **Memory Management**: Image processing uses streaming to handle large files

## 🚀 Next Steps

### Potential Enhancements
1. **Zone Hierarchy**: Implement hierarchical zones (city > district > ward)
2. **Dynamic Assignments**: Allow admins to reassign stewards to different zones
3. **Zone Analytics**: Add zone-specific performance metrics and dashboards
4. **Geofencing**: Real-time location validation for mobile apps
5. **Zone-Based Notifications**: Send alerts only to relevant stewards

### Scaling Considerations
1. **Spatial Partitioning**: Partition issues table by geographical regions
2. **Cache Optimization**: Cache zone boundaries and assignments
3. **Image CDN**: Optimize image delivery with geographical CDN
4. **Database Sharding**: Consider sharding by geographical zones for large deployments

This implementation provides a solid foundation for a zone-based civic engagement platform with realistic test data centered around the IIT Kharagpur area.
