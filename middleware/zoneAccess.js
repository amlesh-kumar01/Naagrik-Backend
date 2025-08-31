const { query, transaction } = require('../config/database');

// Middleware to check if steward has access to specific category in zone
const checkStewardCategoryAccess = async (req, res, next) => {
  try {
    // Only apply category restriction to stewards
    if (req.user.role !== 'STEWARD') {
      return next();
    }

    const { issueId, id } = req.params;
    const { categoryId, zoneId } = req.body;
    
    let targetCategoryId = categoryId;
    let targetZoneId = zoneId;
    
    // If no direct category/zone, get from issue
    if (!targetCategoryId || !targetZoneId) {
      const actualIssueId = issueId || id; // Handle both :issueId and :id parameter names
      if (actualIssueId) {
        // Get category and zone from issue
        const issueResult = await query(`
          SELECT i.category_id, i.zone_id, i.title as issue_title,
                 c.name as category_name, z.area_name as zone_name
          FROM issues i
          JOIN issue_categories c ON i.category_id = c.id
          JOIN zones z ON i.zone_id = z.id
          WHERE i.id = $1
        `, [actualIssueId]);
        
        if (issueResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Issue not found'
          });
        }
        
        const issue = issueResult.rows[0];
        targetCategoryId = issue.category_id;
        targetZoneId = issue.zone_id;
        req.issueDetails = issue; // Store for potential use in controller
      } else {
        return res.status(400).json({
          success: false,
          error: 'Category and zone are required for this operation'
        });
      }
    }
    
    // Check if steward has access to this category in this zone
    const accessResult = await query(`
      SELECT sc.id, sc.notes, c.name as category_name, z.area_name as zone_name
      FROM steward_categories sc
      JOIN issue_categories c ON sc.category_id = c.id
      JOIN zones z ON sc.zone_id = z.id
      WHERE sc.steward_id = $1 AND sc.category_id = $2 AND sc.zone_id = $3
    `, [req.user.id, targetCategoryId, targetZoneId]);
    
    if (accessResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to manage this category in this zone'
      });
    }
    
    req.stewardAccess = accessResult.rows[0]; // Store access details
    next();
  } catch (error) {
    console.error('Category access check error:', error);
    res.status(500).json({
      success: false,
      error: 'Error checking category access permissions'
    });
  }
};

// Middleware to check if user can create issue in zone
const checkZoneExists = async (req, res, next) => {
  try {
    const { zoneId } = req.body;
    
    if (!zoneId) {
      return res.status(400).json({
        success: false,
        error: 'Zone selection is required'
      });
    }
    
    // Check if zone exists and is active
    const zoneResult = await query(`
      SELECT id, area_name, name, type, pincode, is_active
      FROM zones
      WHERE id = $1 AND is_active = true
    `, [zoneId]);
    
    if (zoneResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or inactive zone selected'
      });
    }
    
    req.selectedZone = zoneResult.rows[0];
    next();
  } catch (error) {
    console.error('Zone validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Error validating zone selection'
    });
  }
};

// Middleware to check admin zone access (for admin zone operations)
const checkAdminZoneAccess = async (req, res, next) => {
  try {
    // Only super admins can manage zones
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Only super administrators can manage zones'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin zone access check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify admin zone access'
    });
  }
};

// Helper function to get user's accessible zones (for display purposes)
const getUserAccessibleZones = async (userId, userRole) => {
  try {
    if (userRole === 'SUPER_ADMIN') {
      // Super admins can access all zones
      const result = await query(`
        SELECT id, area_name, name, type, pincode, is_active, created_at
        FROM zones
        WHERE is_active = true
        ORDER BY area_name
      `);
      return result.rows;
    } else if (userRole === 'STEWARD') {
      // Stewards can see zones where they have category assignments
      const result = await query(`
        SELECT DISTINCT z.id, z.area_name, z.name, z.type, z.pincode, z.is_active, z.created_at
        FROM zones z
        JOIN steward_categories sc ON z.id = sc.zone_id
        WHERE sc.steward_id = $1 AND z.is_active = true
        ORDER BY z.area_name
      `, [userId]);
      return result.rows;
    } else {
      // Regular users can view all active zones for issue creation
      const result = await query(`
        SELECT id, area_name, name, type, pincode, is_active, created_at
        FROM zones
        WHERE is_active = true
        ORDER BY area_name
      `);
      return result.rows;
    }
  } catch (error) {
    console.error('Error getting accessible zones:', error);
    throw error;
  }
};

// Helper function to check if steward can manage specific category in zone
const canStewardManageCategory = async (stewardId, categoryId, zoneId) => {
  try {
    const result = await query(`
      SELECT id
      FROM steward_categories
      WHERE steward_id = $1 AND category_id = $2 AND zone_id = $3
    `, [stewardId, categoryId, zoneId]);
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking steward category access:', error);
    throw error;
  }
};

// Legacy function - kept for backward compatibility
const checkStewardZoneAccess = checkStewardCategoryAccess;

module.exports = {
  checkStewardCategoryAccess,
  checkZoneExists,
  checkAdminZoneAccess,
  getUserAccessibleZones,
  canStewardManageCategory,
  checkStewardZoneAccess // Legacy export
};
