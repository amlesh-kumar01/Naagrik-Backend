const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { query, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { uploadImage } = require('../utils/cloudinary');

// Real image URLs for different types of civic issues (Indian context)
const ISSUE_IMAGES = {
  'Roads & Transportation': [
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&q=80', // Pothole
    'https://images.unsplash.com/photo-1572674803692-8082add7c97d?w=800&h=600&fit=crop&q=80', // Traffic
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop&q=80', // Road construction
    'https://images.unsplash.com/photo-1558618047-fcd25c85cd64?w=800&h=600&fit=crop&q=80', // Broken road
    'https://images.unsplash.com/photo-1586974178533-24ad2c64e726?w=800&h=600&fit=crop&q=80', // Traffic jam
  ],
  'Water & Sewerage': [
    'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=800&h=600&fit=crop&q=80', // Flooding
    'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop&q=80', // Water logging
    'https://images.unsplash.com/photo-1541919329513-35f7af297129?w=800&h=600&fit=crop&q=80', // Drainage
    'https://images.unsplash.com/photo-1573575570812-de2dd5b5b9b7?w=800&h=600&fit=crop&q=80', // Water pipe
    'https://images.unsplash.com/photo-1582731047-9e0b10bede42?w=800&h=600&fit=crop&q=80', // Sewerage
  ],
  'Electricity': [
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=600&fit=crop&q=80', // Street lights
    'https://images.unsplash.com/photo-1609770231080-e321deccc34c?w=800&h=600&fit=crop&q=80', // Power lines
    'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&h=600&fit=crop&q=80', // Electrical pole
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80', // Dark street
    'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&h=600&fit=crop&q=80', // Power outage
  ],
  'Waste Management': [
    'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&h=600&fit=crop&q=80', // Garbage bins
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&q=80', // Waste pile
    'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800&h=600&fit=crop&q=80', // Littering
    'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&h=600&fit=crop&q=80', // Overflowing bin
    'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800&h=600&fit=crop&q=80', // Plastic waste
  ],
  'Public Safety': [
    'https://images.unsplash.com/photo-1551845041-63452350a600?w=800&h=600&fit=crop&q=80', // Unsafe area
    'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=800&h=600&fit=crop&q=80', // Dark alley
    'https://images.unsplash.com/photo-1565373413959-927d0a16da08?w=800&h=600&fit=crop&q=80', // Security
    'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&h=600&fit=crop&q=80', // Broken fence
  ],
  'Infrastructure': [
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop&q=80', // Building damage
    'https://images.unsplash.com/photo-1558618047-d14c3c041a2f?w=800&h=600&fit=crop&q=80', // Bus stop
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop&q=80', // Construction
    'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=800&h=600&fit=crop&q=80', // Infrastructure
  ],
  'Environment': [
    'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800&h=600&fit=crop&q=80', // Pollution
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&q=80', // Environmental damage
    'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800&h=600&fit=crop&q=80', // Plastic pollution
  ],
  'Healthcare': [
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&h=600&fit=crop&q=80', // Hospital
    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop&q=80', // Medical facility
  ]
};

class ImageSeeder {
  constructor() {
    this.tempDir = path.join(__dirname, 'temp_images');
    this.uploadedImages = [];
    this.failedUploads = [];
    this.maxRetries = 3;
  }

  async init() {
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    console.log('🖼️ Starting image seeding process...');
    console.log(`📁 Temp directory: ${this.tempDir}`);
    console.log(`☁️ Cloudinary enabled: ${!!process.env.CLOUDINARY_CLOUD_NAME}`);
  }

  async downloadImage(imageUrl, filename, retryCount = 0) {
    try {
      console.log(`⬇️ Downloading: ${filename} (attempt ${retryCount + 1})`);
      
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 30000
      });

      const filePath = path.join(this.tempDir, filename);
      const writer = fs.createWriteStream(filePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`✅ Downloaded: ${filename}`);
          resolve(filePath);
        });
        writer.on('error', (error) => {
          console.error(`❌ Download failed for ${filename}:`, error.message);
          reject(error);
        });
      });
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(`🔄 Retrying download for ${filename}...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        return this.downloadImage(imageUrl, filename, retryCount + 1);
      }
      
      console.error(`❌ Failed to download ${filename} after ${this.maxRetries} attempts:`, error.message);
      throw error;
    }
  }

  async uploadToCloudinary(imagePath, folder = 'naagrik/issues') {
    try {
      const filename = path.basename(imagePath);
      console.log(`☁️ Uploading to Cloudinary: ${filename}`);

      // Use the existing cloudinary utility
      const result = await uploadImage(imagePath, {
        folder: folder,
        resource_type: 'image',
        quality: 'auto:good',
        fetch_format: 'auto'
      });

      console.log(`✅ Uploaded to Cloudinary: ${result.public_id}`);
      
      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height
      };
    } catch (error) {
      console.error(`❌ Cloudinary upload failed for ${imagePath}:`, error.message);
      this.failedUploads.push({ imagePath, error: error.message });
      throw error;
    }
  }

  async processImages() {
    console.log('🔄 Processing images for seeding...');
    
    const processedImages = {};
    
    for (const [category, imageUrls] of Object.entries(ISSUE_IMAGES)) {
      console.log(`\n📂 Processing category: ${category}`);
      processedImages[category] = [];
      
      for (let i = 0; i < imageUrls.length; i++) {
        try {
          const imageUrl = imageUrls[i];
          const filename = `${category.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${i + 1}.jpg`;
          
          // Download image
          const localPath = await this.downloadImage(imageUrl, filename);
          
          // Upload to Cloudinary
          const cloudinaryResult = await this.uploadToCloudinary(localPath, 'naagrik/seed-issues');
          
          processedImages[category].push({
            localPath,
            cloudinaryUrl: cloudinaryResult.url,
            publicId: cloudinaryResult.publicId,
            filename,
            width: cloudinaryResult.width,
            height: cloudinaryResult.height
          });
          
          // Clean up local file
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
          }
          
          // Rate limiting: wait between uploads
          await new Promise(resolve => setTimeout(resolve, 1500));
          
        } catch (error) {
          console.error(`⚠️ Failed to process image ${i + 1} for ${category}:`, error.message);
          
          // Use placeholder as fallback
          processedImages[category].push({
            cloudinaryUrl: `https://via.placeholder.com/800x600/${category === 'Roads & Transportation' ? 'ff6b35' : '007bff'}/ffffff?text=${encodeURIComponent(category + ' Issue')}`,
            publicId: `placeholder_${category}_${i}`,
            filename: `placeholder_${i}.jpg`,
            width: 800,
            height: 600
          });
        }
      }
      
      console.log(`✅ Processed ${processedImages[category].length}/${imageUrls.length} images for ${category}`);
    }
    
    // Report any failures
    if (this.failedUploads.length > 0) {
      console.log(`⚠️ Failed uploads: ${this.failedUploads.length}`);
    }
    
    return processedImages;
  }

  async seedIssueMedia() {
    console.log('🌱 Seeding issue media records...');
    
    return await transaction(async (client) => {
      // Get all issues with their categories
      const issuesResult = await client.query(`
        SELECT i.*, ic.name as category_name 
        FROM issues i 
        JOIN issue_categories ic ON i.category_id = ic.id
        ORDER BY i.created_at DESC
      `);
      
      const issues = issuesResult.rows;
      console.log(`📊 Found ${issues.length} issues to add media to`);
      
      // Process and upload images
      const processedImages = await this.processImages();
      
      let mediaCount = 0;
      
      for (const issue of issues) {
        const categoryImages = processedImages[issue.category_name];
        
        if (!categoryImages || categoryImages.length === 0) {
          console.log(`⚠️ No images available for category: ${issue.category_name}`);
          continue;
        }
        
        // Randomly assign 1-3 images per issue
        const numImages = Math.floor(Math.random() * 3) + 1;
        const selectedImages = [...categoryImages].sort(() => 0.5 - Math.random()).slice(0, numImages);
        
        for (let i = 0; i < selectedImages.length; i++) {
          const image = selectedImages[i];
          const isThumbnail = i === 0; // First image is thumbnail
          
          try {
            await client.query(`
              INSERT INTO issue_media (
                id, issue_id, user_id, media_url, media_type, 
                file_name, file_size, is_thumbnail, moderation_status, 
                ai_tags, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - INTERVAL '${Math.floor(Math.random() * 35)} days')
            `, [
              uuidv4(),
              issue.id,
              issue.user_id,
              image.cloudinaryUrl,
              'IMAGE',
              image.filename,
              Math.floor(Math.random() * 5000000) + 100000, // Random file size 100KB-5MB
              isThumbnail,
              'APPROVED',
              JSON.stringify(['civic-issue', issue.category_name.toLowerCase(), 'kharagpur', 'iit'])
            ]);
            
            mediaCount++;
            console.log(`📸 Added media to: ${issue.title.substring(0, 50)}...`);
            
          } catch (error) {
            console.error(`❌ Failed to add media to issue ${issue.id}:`, error.message);
          }
        }
        
        // Small delay between issues
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`✅ Successfully added ${mediaCount} media records`);
      
      // Print summary
      if (this.failedUploads.length > 0) {
        console.log(`⚠️ Upload failures: ${this.failedUploads.length}`);
        this.failedUploads.forEach(failure => {
          console.log(`   - ${failure.imagePath}: ${failure.error}`);
        });
      }
      
      return mediaCount;
    });
  }

  async cleanup() {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.tempDir, file));
        }
        fs.rmdirSync(this.tempDir);
        console.log('🧹 Cleaned up temporary files');
      }
    } catch (error) {
      console.error('⚠️ Cleanup warning:', error.message);
    }
  }
}

// Alternative: Use placeholder images if Cloudinary isn't available
const createPlaceholderImages = async () => {
  console.log('🎨 Creating placeholder images...');
  
  return await transaction(async (client) => {
    const issuesResult = await client.query(`
      SELECT i.*, ic.name as category_name 
      FROM issues i 
      JOIN issue_categories ic ON i.category_id = ic.id
    `);
    
    const issues = issuesResult.rows;
    let mediaCount = 0;
    
    // Placeholder image configurations
    const placeholderConfigs = {
      'Roads & Transportation': { color: 'ff6b35', bg: 'ffffff' },
      'Water & Sewerage': { color: '1e90ff', bg: 'ffffff' },
      'Electricity': { color: 'ffd700', bg: '000000' },
      'Waste Management': { color: '32cd32', bg: 'ffffff' },
      'Public Safety': { color: 'dc143c', bg: 'ffffff' },
      'Infrastructure': { color: '8a2be2', bg: 'ffffff' },
      'Environment': { color: '228b22', bg: 'ffffff' },
      'Healthcare': { color: 'ff1493', bg: 'ffffff' }
    };
    
    for (const issue of issues) {
      const config = placeholderConfigs[issue.category_name] || placeholderConfigs['Infrastructure'];
      const numImages = Math.floor(Math.random() * 2) + 1; // 1-2 images per issue
      
      for (let i = 0; i < numImages; i++) {
        const imageUrl = `https://via.placeholder.com/800x600/${config.color}/${config.bg}?text=${encodeURIComponent(issue.category_name + ' Issue ' + (i + 1))}`;
        const isThumbnail = i === 0;
        
        await client.query(`
          INSERT INTO issue_media (
            id, issue_id, user_id, media_url, media_type, 
            file_name, file_size, is_thumbnail, moderation_status, 
            ai_tags, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - INTERVAL '${Math.floor(Math.random() * 35)} days')
        `, [
          uuidv4(),
          issue.id,
          issue.user_id,
          imageUrl,
          'IMAGE',
          `${issue.category_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${i + 1}.jpg`,
          Math.floor(Math.random() * 2000000) + 50000, // 50KB-2MB
          isThumbnail,
          'APPROVED',
          JSON.stringify(['placeholder', issue.category_name.toLowerCase(), 'test-data'])
        ]);
        
        mediaCount++;
      }
    }
    
    console.log(`✅ Created ${mediaCount} placeholder media records`);
    return mediaCount;
  });
};

// Main execution function
const runImageSeeding = async (useRealImages = false) => {
  console.log('🚀 Starting image seeding process...');
  
  try {
    if (useRealImages && process.env.CLOUDINARY_CLOUD_NAME) {
      console.log('🌐 Using real images with Cloudinary upload...');
      const seeder = new ImageSeeder();
      await seeder.init();
      const mediaCount = await seeder.seedIssueMedia();
      await seeder.cleanup();
      console.log(`🎉 Successfully seeded ${mediaCount} real images!`);
      return mediaCount;
    } else {
      console.log('🎨 Using placeholder images (Cloudinary not configured or disabled)...');
      const mediaCount = await createPlaceholderImages();
      console.log(`🎉 Successfully seeded ${mediaCount} placeholder images!`);
      return mediaCount;
    }
  } catch (error) {
    console.error('💥 Image seeding failed:', error);
    
    // Fallback to placeholder images
    console.log('🔄 Falling back to placeholder images...');
    try {
      const mediaCount = await createPlaceholderImages();
      console.log(`✅ Fallback successful: ${mediaCount} placeholder images created`);
      return mediaCount;
    } catch (fallbackError) {
      console.error('💥 Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const useRealImages = args.includes('--real-images') || args.includes('-r');
  
  console.log('📷 Image Seeding Configuration:');
  console.log(`   Real Images: ${useRealImages ? 'Yes' : 'No (placeholder)'}`);
  console.log(`   Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? 'Configured' : 'Not configured'}`);
  
  runImageSeeding(useRealImages)
    .then((mediaCount) => {
      console.log(`✅ Image seeding completed! Added ${mediaCount} media files.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Image seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { runImageSeeding, ImageSeeder, createPlaceholderImages };
