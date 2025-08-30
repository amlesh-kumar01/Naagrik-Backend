# Frontend Development Prompts & Requirements

## Overview
This document provides detailed prompts and requirements for creating a complete admin panel and user management system for the Naagrik civic issues platform.

---

## 1. User Profile System

### Page Requirements

#### 1.1 User Profile Page (`/profile`)

**Prompt for Frontend Developer:**
```
Create a comprehensive user profile page with the following features:

LAYOUT:
- Header with user avatar (clickable to upload), name, email, and reputation score
- Tabbed interface with: Overview, Statistics, Badges, Settings
- Responsive design for mobile and desktop

OVERVIEW TAB:
- Profile information display with edit capability
- Recent activity feed (last 10 actions)
- Quick stats cards (issues created, comments, votes)

STATISTICS TAB:
- Visual charts showing:
  * Issues created over time (line chart)
  * Issue categories breakdown (pie chart)
  * Monthly activity heatmap
  * Reputation score progression

BADGES TAB:
- Grid layout of earned badges with hover effects
- Badge details modal on click
- Progress indicators for next achievable badges

SETTINGS TAB:
- Profile edit form (name, email)
- Password change form
- Notification preferences
- Account deletion option

TECHNICAL REQUIREMENTS:
- Use React with hooks
- Implement form validation
- Add loading states and error handling
- Include image upload with preview
- Make API calls to: /api/users/profile, /api/users/stats, /api/users/badges
```

#### 1.2 Profile Components Needed

**ProfileHeader Component:**
```jsx
// Required props: user object, onImageUpload function
// Features: Avatar display, reputation badge, edit button
// API: GET /api/users/profile, POST /api/upload/profile
```

**StatsChart Component:**
```jsx
// Required props: stats object, chartType
// Features: Responsive charts using Chart.js or Recharts
// Data visualization for user activity
```

**BadgeGrid Component:**
```jsx
// Required props: badges array
// Features: Responsive grid, hover effects, modal details
// API: GET /api/users/badges
```

---

## 2. Steward Application System

### Page Requirements

#### 2.1 Steward Application Page (`/steward/apply`)

**Prompt for Frontend Developer:**
```
Create a steward application system with these features:

APPLICATION FORM:
- Multi-step form with progress indicator
- Step 1: Eligibility check (minimum reputation, account age)
- Step 2: Justification textarea (50-1000 characters with counter)
- Step 3: Review and submit with terms acceptance

APPLICATION STATUS:
- Current application status display
- Timeline showing application progress
- Feedback display if application was reviewed

ELIGIBILITY CHECKER:
- Real-time validation of user eligibility
- Requirements display:
  * Minimum 100 reputation points
  * Account older than 30 days
  * No previous rejected applications in last 6 months
  * At least 5 issues reported

UI/UX REQUIREMENTS:
- Progress stepper component
- Character counter for textarea
- Validation messages
- Success/error alerts
- Disabled states for ineligible users

API INTEGRATION:
- POST /api/stewards/applications (submit)
- GET /api/stewards/applications/me (check status)
- GET /api/users/profile (eligibility check)
```

#### 2.2 Steward Dashboard (`/steward/dashboard`)

**Prompt for Frontend Developer:**
```
Create a steward dashboard with these sections:

HEADER SECTION:
- Welcome message with steward name
- Current zone assignments display
- Quick action buttons (add note, view pending issues)

STATISTICS CARDS:
- Issues reviewed this month
- Notes added
- Average resolution time
- Performance score

ASSIGNED ZONES MAP:
- Interactive map showing assigned zones
- Click to filter issues by zone
- Zone boundaries highlight

RECENT ACTIVITY:
- Timeline of recent steward actions
- Notes added to issues
- Status changes made

QUICK ACTIONS:
- Search issues in assigned zones
- Add notes to issues
- Generate reports

TECHNICAL REQUIREMENTS:
- Real-time updates using WebSocket
- Map integration (Google Maps or Mapbox)
- Export functionality for reports
- Mobile-responsive design
```

---

## 3. Admin Panel System

### Page Requirements

#### 3.1 Admin Dashboard (`/admin/dashboard`)

**Prompt for Frontend Developer:**
```
Create a comprehensive admin dashboard with:

OVERVIEW METRICS:
- Total users, stewards, pending applications
- Issues created today/week/month
- System health indicators
- User growth charts

QUICK ACTIONS PANEL:
- Review pending applications (with count badge)
- Manage steward assignments
- View system logs
- Generate reports

CHARTS AND ANALYTICS:
- User registration trends
- Issue reporting patterns
- Steward performance metrics
- Geographic distribution of issues

RECENT ACTIVITY FEED:
- Latest user registrations
- New steward applications
- System alerts and notifications

SIDEBAR NAVIGATION:
- Dashboard (overview)
- User Management
- Steward Management
- Applications
- Reports
- Settings

RESPONSIVE DESIGN:
- Collapsible sidebar on mobile
- Card-based layout
- Dark/light theme toggle
```

#### 3.2 User Management Page (`/admin/users`)

**Prompt for Frontend Developer:**
```
Create a user management interface with:

USER TABLE:
- Sortable columns: Name, Email, Role, Reputation, Join Date
- Search and filter functionality
- Pagination (50 users per page)
- Bulk actions (export, role change)

SEARCH FEATURES:
- Real-time search by name/email
- Advanced filters:
  * Role selection
  * Reputation range
  * Registration date range
  * Active/inactive status

USER DETAILS MODAL:
- Complete user profile view
- Activity history
- Statistics summary
- Role change functionality
- Account status management

ACTIONS AVAILABLE:
- View user details
- Change user role
- Reset password (send email)
- Suspend/activate account
- Export user data

TABLE FEATURES:
- Row selection checkboxes
- Sort indicators
- Loading states
- Empty states
- Error handling

API ENDPOINTS:
- GET /api/users/search
- PUT /api/users/:id/role
- GET /api/users/:id/details
```

#### 3.3 Steward Applications Page (`/admin/applications`)

**Prompt for Frontend Developer:**
```
Create an application review interface with:

APPLICATION CARDS:
- Applicant photo and basic info
- Application justification (expandable)
- Submission date and status
- Approve/Reject buttons

REVIEW MODAL:
- Full application details
- Applicant history and stats
- Feedback textarea
- Decision buttons with confirmation

FILTERING OPTIONS:
- Status filter (Pending, Approved, Rejected)
- Date range filter
- Sort by submission date/reputation

BULK ACTIONS:
- Select multiple applications
- Bulk approve/reject
- Export applications list

NOTIFICATION SYSTEM:
- Real-time notifications for new applications
- Email integration for decisions
- Status change confirmations

WORKFLOW FEATURES:
- Application assignment to reviewers
- Review notes and comments
- Decision history tracking

RESPONSIVE DESIGN:
- Card layout on mobile
- Table view on desktop
- Touch-friendly interactions
```

#### 3.4 Steward Management Page (`/admin/stewards`)

**Prompt for Frontend Developer:**
```
Create a steward management system with:

STEWARD LIST:
- Grid/table toggle view
- Performance metrics display
- Zone assignment indicators
- Quick action buttons

ZONE ASSIGNMENT:
- Interactive map for zone selection
- Drag-and-drop assignment
- Zone coverage visualization
- Assignment history

PERFORMANCE TRACKING:
- Individual steward metrics
- Comparison charts
- Performance ranking
- Activity reports

STEWARD DETAILS:
- Profile information
- Assigned zones list
- Performance statistics
- Recent activity log

ASSIGNMENT TOOLS:
- Zone selector dropdown
- Multiple zone assignment
- Assignment scheduling
- Workload balancing

FEATURES REQUIRED:
- Search and filter stewards
- Performance analytics
- Zone coverage reporting
- Assignment conflict detection

MAP INTEGRATION:
- Show zone boundaries
- Steward location markers
- Issue density overlay
- Real-time updates
```

---

## 4. Component Library Requirements

### 4.1 Reusable Components Needed

#### Data Display Components:
```jsx
// StatCard - for displaying metrics
// UserAvatar - consistent user image display
// BadgeIcon - for reputation badges
// StatusPill - for application/issue status
// PerformanceChart - for steward metrics
// DataTable - reusable table with sorting/filtering
// SearchBox - with debounced input
// FilterPanel - for advanced filtering
```

#### Form Components:
```jsx
// FormField - with validation display
// FileUpload - with preview and progress
// TextCounter - for character counting
// MultiSelect - for zone assignments
// DateRangePicker - for filtering
// ConfirmDialog - for destructive actions
```

#### Layout Components:
```jsx
// DashboardLayout - common admin layout
// ContentHeader - page headers with breadcrumbs
// Sidebar - collapsible navigation
// TabContainer - for tabbed interfaces
// Modal - reusable modal wrapper
// LoadingSpinner - consistent loading states
```

### 4.2 Design System Requirements

**Color Scheme:**
```css
/* Primary Colors */
--primary-blue: #3B82F6;
--primary-dark: #1E40AF;
--primary-light: #DBEAFE;

/* Status Colors */
--success-green: #10B981;
--warning-yellow: #F59E0B;
--error-red: #EF4444;
--info-blue: #06B6D4;

/* Neutral Colors */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-500: #6B7280;
--gray-900: #111827;
```

**Typography:**
```css
/* Headings */
--heading-xl: 2.25rem/2.5rem;
--heading-lg: 1.875rem/2.25rem;
--heading-md: 1.5rem/2rem;

/* Body Text */
--text-lg: 1.125rem/1.75rem;
--text-base: 1rem/1.5rem;
--text-sm: 0.875rem/1.25rem;
```

---

## 5. State Management Architecture

### 5.1 Redux Store Structure

```jsx
// store/index.js
const store = {
  auth: {
    user: null,
    token: null,
    loading: false
  },
  users: {
    profile: null,
    stats: null,
    badges: [],
    searchResults: [],
    loading: false
  },
  stewards: {
    application: null,
    dashboard: null,
    zones: [],
    allStewards: [],
    pendingApplications: [],
    loading: false
  },
  admin: {
    metrics: null,
    users: [],
    applications: [],
    systemHealth: null,
    loading: false
  },
  ui: {
    sidebarOpen: true,
    theme: 'light',
    notifications: []
  }
};
```

### 5.2 API Service Layer

```jsx
// services/api.js
class ApiService {
  // User endpoints
  async getProfile() { /* GET /api/users/profile */ }
  async updateProfile(data) { /* PUT /api/users/profile */ }
  async uploadAvatar(file) { /* POST /api/upload/profile */ }
  async getUserStats() { /* GET /api/users/stats */ }
  async getUserBadges() { /* GET /api/users/badges */ }
  
  // Steward endpoints
  async submitApplication(data) { /* POST /api/stewards/applications */ }
  async getApplicationStatus() { /* GET /api/stewards/applications/me */ }
  async getStewardZones() { /* GET /api/stewards/zones/me */ }
  
  // Admin endpoints
  async getPendingApplications() { /* GET /api/stewards/applications/pending */ }
  async reviewApplication(id, decision) { /* PUT /api/stewards/applications/:id/review */ }
  async getAllStewards() { /* GET /api/stewards/ */ }
  async searchUsers(query) { /* GET /api/users/search */ }
}
```

---

## 6. Testing Requirements

### 6.1 Unit Tests Needed

```jsx
// Tests for each component
// User Profile Components
- ProfileHeader.test.jsx
- StatsChart.test.jsx
- BadgeGrid.test.jsx
- ProfileForm.test.jsx

// Steward Components
- ApplicationForm.test.jsx
- StewardDashboard.test.jsx
- ZoneAssignment.test.jsx

// Admin Components
- UserTable.test.jsx
- ApplicationReview.test.jsx
- StewardManagement.test.jsx

// Utilities and Services
- api.service.test.js
- validation.utils.test.js
- helpers.test.js
```

### 6.2 Integration Tests

```jsx
// End-to-end test scenarios
- User registration and profile creation
- Steward application submission and approval
- Admin reviewing applications
- Zone assignment workflow
- User role changes
- Data export functionality
```

---

## 7. Performance Requirements

### 7.1 Optimization Targets

- **Initial page load**: < 3 seconds
- **API response time**: < 500ms
- **Image uploads**: Progress indicators and compression
- **Table rendering**: Virtual scrolling for large datasets
- **Chart rendering**: Lazy loading and caching

### 7.2 Caching Strategy

```jsx
// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Cache keys
const CACHE_KEYS = {
  userProfile: 'user-profile',
  userStats: 'user-stats',
  stewardZones: 'steward-zones',
  pendingApplications: 'pending-applications',
  allStewards: 'all-stewards'
};
```

---

## 8. Security Considerations

### 8.1 Frontend Security

- **Input validation**: Client-side validation for all forms
- **XSS prevention**: Sanitize all user inputs
- **CSRF protection**: Include CSRF tokens in forms
- **File upload security**: Validate file types and sizes
- **Route protection**: Guard admin routes with role checks

### 8.2 Authentication Flow

```jsx
// Protected route wrapper
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  if (requiredRole && user.role !== requiredRole) {
    return <AccessDenied />;
  }
  
  return children;
};

// Usage
<Route path="/admin/*" element={
  <ProtectedRoute requiredRole="SUPER_ADMIN">
    <AdminPanel />
  </ProtectedRoute>
} />
```

---

This comprehensive guide provides everything needed to build a complete user profile and steward management system with a full-featured admin panel. Each section includes specific prompts, technical requirements, and implementation details for frontend developers.
