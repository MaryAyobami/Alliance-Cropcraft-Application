# 🌱 Alliance CropCraft Farm Management System

A comprehensive farm management system built with React, Node.js, and PostgreSQL. Designed for efficient livestock management, task tracking, and agricultural operations.

## ✨ Features

### 🔐 Authentication & User Management
- Secure user registration and login
- Email verification system
- Role-based access control (Admin, Farm Manager, Veterinary Doctor, etc.)
- Password reset functionality
- Avatar upload and profile management

### 📋 Task Management
- Create and assign tasks to team members
- Task priority levels (High, Medium, Low)
- Due date and time tracking
- Task completion with evidence photos
- Static (recurring) and dynamic (one-time) tasks
- Real-time notifications for task assignments

### 🐄 Livestock Management
- Comprehensive livestock records
- Health status tracking (Healthy, Sick, Quarantine, Deceased)
- Species, breed, and identification management
- Vaccination records and medical history
- Feeding schedules and notes
- Photo documentation
- Age and weight tracking

### 📅 Calendar & Events
- Event creation and management
- Calendar view with event visualization
- Event types (Meeting, Appointment, Task, etc.)
- Location and time management
- Event notifications

### 📊 Reports & Analytics
- Task completion analytics
- Staff performance tracking
- Livestock health reports
- Segmented reporting (Task Reports & Livestock Reports)
- Data export functionality
- Interactive charts and visualizations

### 🔔 Notifications
- Email notifications for task assignments
- Event creation notifications
- Daily task summaries
- Evening performance reviews
- Task reminders and alerts

## 🚀 Technology Stack

### Frontend
- **React 18** - Modern UI library
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **Chart.js & React Chart.js 2** - Data visualization
- **Axios** - HTTP client
- **Vite** - Fast build tool

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File upload handling
- **Cloudinary** - Image storage
- **Nodemailer** - Email service
- **Node-cron** - Scheduled tasks

### Additional Features
- **PWA Support** - Install as mobile app
- **Push Notifications** - Real-time alerts
- **Responsive Design** - Mobile-first approach
- **Email Verification** - Secure onboarding

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn package manager

### 1. Clone the Repository
```bash
git clone <repository-url>
cd alliance-cropcraft
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Install Backend Dependencies
```bash
cd server
npm install
cd ..
```

### 4. Database Setup
Create a PostgreSQL database and run the following SQL commands:

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'Staff',
  avatar TEXT,
  email_confirmed_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  confirmation_token VARCHAR(255),
  confirmation_sent_at TIMESTAMP,
  notif_email BOOLEAN DEFAULT true,
  notif_push BOOLEAN DEFAULT true,
  notif_morning VARCHAR(10) DEFAULT 'enabled',
  notif_evening VARCHAR(10) DEFAULT 'enabled',
  push_subscription JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_sign_in_at TIMESTAMP
);

-- Tasks table
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  assigned_to INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id),
  due_date DATE,
  due_time TIME,
  location VARCHAR(255),
  photo TEXT[],
  completed_at TIMESTAMP,
  completion_notes TEXT,
  evidence_photo TEXT,
  tag VARCHAR(20) DEFAULT 'static',
  recurrent BOOLEAN DEFAULT true,
  active_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time VARCHAR(10),
  location VARCHAR(255),
  type VARCHAR(50) DEFAULT 'Task',
  priority VARCHAR(20) DEFAULT 'medium',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Livestock table
CREATE TABLE livestock (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  species VARCHAR(50) NOT NULL,
  breed VARCHAR(50),
  age INTEGER,
  weight DECIMAL(8,2),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
  health_status VARCHAR(20) DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'sick', 'quarantine', 'deceased')),
  location VARCHAR(100),
  acquisition_date DATE,
  identification_number VARCHAR(50) UNIQUE,
  vaccination_records JSONB DEFAULT '[]',
  medical_history JSONB DEFAULT '[]',
  feeding_schedule TEXT,
  notes TEXT,
  photos TEXT[],
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Reports table
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  report_type VARCHAR(100),
  generated_by INTEGER REFERENCES users(id),
  generated_at TIMESTAMP DEFAULT NOW(),
  data JSONB
);

-- Push subscriptions table
CREATE TABLE push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Environment Variables

Create a `.env` file in the server directory:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Server Configuration
PORT=5000
NODE_ENV=production
```

## 🚀 Deployment

### Development Mode
```bash
# Start backend server
cd server
npm run dev

# Start frontend (in another terminal)
cd ..
npm run dev
```

### Production Deployment

#### Frontend (Vercel/Netlify)
```bash
# Build the frontend
npm run build

# Deploy to Vercel
npx vercel --prod

# Or deploy to Netlify
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### Backend (Railway/Heroku/DigitalOcean)

**For Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

**For Heroku:**
```bash
# Install Heroku CLI and login
heroku login

# Create app and deploy
heroku create your-app-name
git subtree push --prefix server heroku main
```

### Environment Setup for Production

1. **Database**: Use a managed PostgreSQL service (Railway, Supabase, or AWS RDS)
2. **Email**: Configure with Gmail App Password or SendGrid
3. **File Storage**: Configure Cloudinary for image uploads
4. **Domain**: Set up custom domain and SSL certificate

## 👥 User Roles & Permissions

| Feature | Admin | Farm Manager | Veterinary Doctor | Other Staff |
|---------|-------|--------------|-------------------|-------------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| Manage Tasks | ✅ | ✅ | ✅ | ✅ |
| View Calendar | ✅ | ✅ | ✅ | ✅ |
| View Livestock | ✅ | ✅ | ✅ | ✅ |
| Create Livestock | ✅ | ✅ | ❌ | ❌ |
| Update Livestock | ✅ | ✅ | ✅ | ❌ |
| Delete Livestock | ✅ | ✅ | ❌ | ❌ |
| View Reports | ✅ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |

## 📱 PWA Features

The application supports Progressive Web App features:
- Install on mobile devices
- Offline capability (limited)
- Push notifications
- App-like experience

To install:
1. Open the app in Chrome/Safari
2. Look for "Install App" prompt
3. Follow installation instructions

## 🔧 Configuration

### Email Notifications
Configure email settings in the notification system:
- Daily morning summaries (7 AM)
- Evening reviews (8 PM)
- Task reminders (30 minutes before due)
- Urgent alerts (15 minutes before due)

### Push Notifications
Enable push notifications for:
- Task assignments
- Event reminders
- System alerts
- Custom notifications

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL service is running
   - Verify database credentials in `.env`
   - Ensure database exists and is accessible

2. **Email Not Sending**
   - Verify email credentials
   - Check Gmail App Password is correct
   - Ensure "Less secure app access" is enabled (if using Gmail)

3. **File Upload Issues**
   - Verify Cloudinary configuration
   - Check upload size limits
   - Ensure proper file permissions

4. **Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility
   - Verify all dependencies are installed

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/send-verification` - Resend verification email
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### Task Endpoints
- `GET /api/tasks` - Get tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id/complete` - Complete task
- `POST /api/tasks/:id/complete-with-evidence` - Complete with evidence

### Livestock Endpoints
- `GET /api/livestock` - Get all livestock
- `GET /api/livestock/:id` - Get livestock by ID
- `POST /api/livestock` - Create livestock record
- `PUT /api/livestock/:id` - Update livestock record
- `DELETE /api/livestock/:id` - Delete livestock record

### Event Endpoints
- `GET /api/events` - Get events
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Report Endpoints
- `GET /api/reports/stats` - Get statistics
- `GET /api/reports/staff-performance` - Staff performance data
- `GET /api/reports/export` - Export reports

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏢 About Alliance CropCraft

Alliance CropCraft is a comprehensive farm management solution designed to streamline agricultural operations, improve efficiency, and enhance productivity for modern farms.

### Key Benefits
- 📈 Increased operational efficiency
- 📊 Data-driven decision making
- 🔄 Streamlined workflows
- 📱 Mobile accessibility
- 👥 Team collaboration
- 📋 Compliance tracking

### Support
For support and questions, please contact:
- Email: support@alliancecropcraft.com
- Documentation: [docs.alliancecropcraft.com](https://docs.alliancecropcraft.com)
- Issue Tracker: [GitHub Issues](https://github.com/alliance-cropcraft/issues)

---

**Built with ❤️ for modern agriculture**