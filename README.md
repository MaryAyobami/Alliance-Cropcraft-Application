# Alliance CropCraft - Farm Management System

A comprehensive farm management application built with React, Node.js, and PostgreSQL, designed to streamline agricultural operations, livestock management, and task coordination.

## 🚀 Features

### Core Functionality
- **User Authentication & Authorization**
  - Secure login/registration with JWT tokens
  - Role-based access control (Admin, Farm Manager, Veterinary Doctor, Farm Attendant, etc.)
  - Email verification system
  - Password reset functionality

- **Dashboard & Analytics**
  - Real-time farm statistics
  - Task completion tracking
  - Staff performance metrics
  - Interactive charts and visualizations

- **Task Management**
  - Create, assign, and track tasks
  - Static (recurring) and dynamic task types
  - Priority levels and due dates
  - Evidence photo uploads for task completion
  - Task categorization and filtering

- **Calendar & Events**
  - Event scheduling and management
  - Reminder notifications
  - Event categorization (Task, Meeting, Event)
  - Location tracking

- **Livestock Management** 🆕
  - Comprehensive livestock inventory
  - Health status tracking
  - Breed and type management
  - Location and notes
  - Role-based permissions (Admin/Farm Manager can create, Vet can update)

- **Reports & Analytics**
  - **Task Reports**: Staff performance, completion rates, trends
  - **Livestock Reports**: Health statistics, type distribution, trends
  - Export functionality
  - Date range filtering

- **Notifications System**
  - Push notifications
  - Email notifications
  - Customizable notification preferences
  - Morning and evening notification schedules

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Chart.js** - Interactive charts and graphs
- **Lucide React** - Beautiful icons
- **React Router** - Client-side routing

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **PostgreSQL** - Relational database
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Multer** - File upload handling
- **Cloudinary** - Cloud image storage
- **Cron** - Scheduled tasks

### Additional Features
- **PWA Support** - Progressive Web App capabilities
- **Responsive Design** - Mobile-first approach
- **Real-time Updates** - Live data synchronization
- **Error Handling** - Comprehensive error management
- **Security** - SQL injection protection, input validation

## 🎨 UI/UX Features

### Enhanced Color Scheme
- **Primary**: Green-based theme (maintains farm aesthetic)
- **Complementary Colors**:
  - Sunset gradients (orange to purple)
  - Ocean gradients (blue to indigo)
  - Forest gradients (green to teal)
  - Warm gradients (yellow to red)
  - Cool gradients (cyan to indigo)

### Modern Design Elements
- Smooth animations and transitions
- Glassmorphism effects
- Gradient backgrounds
- Interactive hover states
- Responsive grid layouts
- Beautiful form designs

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn package manager
- Modern web browser

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd alliance-cropcraft
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 3. Database Setup
```bash
# Create PostgreSQL database
createdb alliance_cropcraft

# Run the schema
psql -d alliance_cropcraft -f database_schema.sql
```

### 4. Environment Configuration
Create `.env` files in both root and server directories:

**Root `.env`:**
```env
VITE_API_BASE_URL=http://localhost:5000
```

**Server `.env`:**
```env
PORT=5000
JWT_SECRET=your-super-secret-jwt-key
DATABASE_URL=postgresql://username:password@localhost:5432/alliance_cropcraft
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 5. Start the Application
```bash
# Start backend server
cd server
npm start

# In another terminal, start frontend
npm run dev
```

The application will be available at `http://localhost:5173`

## 🔐 User Roles & Permissions

### Admin
- Full system access
- User management
- All CRUD operations
- Reports access

### Farm Manager
- Livestock management (create, update, delete)
- Task management
- Staff oversight
- Limited reports access

### Veterinary Doctor
- Livestock health updates
- Health status modifications
- Task completion
- Health reports

### Farm Attendant
- Task execution
- Basic livestock viewing
- Task completion with evidence

## 📊 Database Schema

The application uses the following main tables:
- `users` - User accounts and profiles
- `tasks` - Task management and tracking
- `events` - Calendar events and scheduling
- `livestock` - Animal inventory and health
- `notifications` - System notifications
- `verification_tokens` - Email verification
- `password_reset_tokens` - Password recovery

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration and email verification
- [ ] Login with verified/unverified accounts
- [ ] Task creation, assignment, and completion
- [ ] Event scheduling and management
- [ ] Livestock CRUD operations
- [ ] Role-based access control
- [ ] Form validation and error handling
- [ ] Responsive design on different devices
- [ ] Notification system functionality

### Error Handling Verification
- [ ] Form validation errors
- [ ] Server error responses
- [ ] Network connectivity issues
- [ ] Database connection failures
- [ ] File upload errors
- [ ] Authentication failures

## 🚀 Deployment

### Production Build
```bash
# Build frontend
npm run build

# The built files will be in the `dist` directory
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use strong JWT secrets
- Configure production database
- Set up Cloudinary credentials
- Configure CORS for production domain

### Deployment Platforms
- **Vercel** - Frontend deployment
- **Railway/Heroku** - Backend deployment
- **Supabase** - Database hosting
- **Cloudinary** - Image storage

## 🔧 Configuration

### Customization Options
- Color scheme modifications in `src/index.css`
- Role permissions in `server/server.js`
- Notification schedules in user preferences
- Task categories and priorities
- Livestock types and health statuses

## 📱 PWA Features

- Installable on mobile devices
- Offline functionality
- Push notifications
- App-like experience

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Changelog

### Version 1.0.0
- Initial release with core farm management features
- User authentication and role-based access
- Task and event management
- Livestock management system
- Comprehensive reporting
- Enhanced UI with complementary color scheme
- Email verification system
- Error handling improvements

---

**Alliance CropCraft** - Empowering modern agriculture through intelligent farm management.