# Deployment Guide - Alliance CropCraft

This guide provides comprehensive instructions for deploying the Alliance CropCraft farm management system to production environments.

## 🚀 Pre-Deployment Checklist

### Frontend Requirements
- [ ] All dependencies installed (`npm install`)
- [ ] Environment variables configured
- [ ] Build process tested (`npm run build`)
- [ ] No console errors or warnings
- [ ] Responsive design verified
- [ ] PWA functionality tested

### Backend Requirements
- [ ] All dependencies installed (`npm install`)
- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] API endpoints responding correctly
- [ ] Error handling verified
- [ ] Security measures implemented

### Database Requirements
- [ ] PostgreSQL database created
- [ ] Schema applied (`database_schema.sql`)
- [ ] Sample data inserted
- [ ] Indexes created for performance
- [ ] Backup strategy implemented

## 🔧 Environment Configuration

### Frontend Environment Variables
Create `.env.production` in the root directory:

```env
VITE_API_BASE_URL=https://your-api-domain.com
VITE_APP_NAME=Alliance CropCraft
VITE_APP_VERSION=1.0.0
```

### Backend Environment Variables
Create `.env` in the server directory:

```env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=24h

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database_name

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Configuration (if implementing real email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://www.your-domain.com

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🗄️ Database Setup

### Production Database Creation
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE alliance_cropcraft_prod;

-- Create user (optional, for security)
CREATE USER cropcraft_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE alliance_cropcraft_prod TO cropcraft_user;

-- Connect to the new database
\c alliance_cropcraft_prod

-- Run the schema
\i database_schema.sql

-- Verify tables
\dt

-- Check indexes
\di
```

### Database Optimization
```sql
-- Analyze tables for query optimization
ANALYZE;

-- Vacuum tables
VACUUM ANALYZE;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public';
```

## 🌐 Frontend Deployment

### Vercel Deployment (Recommended)

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Login to Vercel**
```bash
vercel login
```

3. **Deploy**
```bash
vercel --prod
```

4. **Configure Environment Variables**
   - Go to Vercel Dashboard
   - Select your project
   - Go to Settings > Environment Variables
   - Add all production environment variables

### Netlify Deployment

1. **Build the project**
```bash
npm run build
```

2. **Deploy to Netlify**
   - Drag and drop the `dist` folder to Netlify
   - Or use Netlify CLI

3. **Configure redirects**
Create `_redirects` file in `public/`:
```
/*    /index.html   200
```

### GitHub Pages Deployment

1. **Add homepage to package.json**
```json
{
  "homepage": "https://username.github.io/repository-name"
}
```

2. **Install gh-pages**
```bash
npm install --save-dev gh-pages
```

3. **Add scripts to package.json**
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

4. **Deploy**
```bash
npm run deploy
```

## ⚙️ Backend Deployment

### Railway Deployment

1. **Connect GitHub repository**
2. **Set environment variables**
3. **Deploy automatically**

### Heroku Deployment

1. **Install Heroku CLI**
```bash
npm install -g heroku
```

2. **Login to Heroku**
```bash
heroku login
```

3. **Create app**
```bash
heroku create your-app-name
```

4. **Add PostgreSQL addon**
```bash
heroku addons:create heroku-postgresql:hobby-dev
```

5. **Set environment variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret-key
```

6. **Deploy**
```bash
git push heroku main
```

### DigitalOcean App Platform

1. **Connect GitHub repository**
2. **Configure environment variables**
3. **Set build commands**
4. **Deploy**

## 🔒 Security Configuration

### SSL/TLS Setup
- Enable HTTPS on all domains
- Configure SSL certificates (Let's Encrypt)
- Redirect HTTP to HTTPS

### CORS Configuration
```javascript
// In server.js
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### Rate Limiting
```javascript
// Add rate limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);
```

### Security Headers
```javascript
// Add security headers
const helmet = require('helmet');
app.use(helmet());

// Content Security Policy
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"],
  },
}));
```

## 📊 Monitoring & Logging

### Application Monitoring
```javascript
// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});

// Add detailed health check
app.get('/health/detailed', async (req, res) => {
  try {
    // Test database connection
    const dbResult = await pool.query('SELECT NOW()');
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      database: 'Connected',
      databaseTime: dbResult.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});
```

### Error Logging
```javascript
// Add error logging middleware
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    user: req.user?.id || 'anonymous'
  });
  
  res.status(500).json({ message: 'Internal server error' });
});
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run deploy

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run deploy
```

## 📱 PWA Configuration

### Service Worker
Ensure `public/sw.js` is properly configured for production:

```javascript
const CACHE_NAME = 'alliance-cropcraft-v1.0.0';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});
```

### Manifest File
Update `public/manifest.json`:

```json
{
  "name": "Alliance CropCraft",
  "short_name": "CropCraft",
  "description": "Farm Management System",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#16a34a",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 🧪 Post-Deployment Testing

### Functional Testing
- [ ] User registration and login
- [ ] Task creation and management
- [ ] Livestock operations
- [ ] Calendar functionality
- [ ] Reports generation
- [ ] File uploads
- [ ] Notifications

### Performance Testing
- [ ] Page load times
- [ ] API response times
- [ ] Database query performance
- [ ] Image loading speed
- [ ] Mobile performance

### Security Testing
- [ ] Authentication bypass attempts
- [ ] SQL injection tests
- [ ] XSS vulnerability checks
- [ ] CSRF protection
- [ ] Rate limiting effectiveness

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL format
   - Verify database exists and is accessible
   - Check firewall settings

2. **CORS Errors**
   - Verify CORS_ORIGIN configuration
   - Check frontend URL matches allowed origins

3. **JWT Token Issues**
   - Verify JWT_SECRET is set
   - Check token expiration settings

4. **File Upload Failures**
   - Verify Cloudinary credentials
   - Check file size limits
   - Verify upload directory permissions

### Debug Commands
```bash
# Check server logs
heroku logs --tail

# Check database connection
heroku pg:psql

# Restart application
heroku restart

# Check environment variables
heroku config
```

## 📈 Performance Optimization

### Database Optimization
- Regular VACUUM and ANALYZE
- Monitor slow queries
- Add appropriate indexes
- Connection pooling

### Frontend Optimization
- Enable gzip compression
- Use CDN for static assets
- Implement lazy loading
- Optimize images

### Backend Optimization
- Enable compression middleware
- Implement caching strategies
- Use PM2 for process management
- Monitor memory usage

## 🔄 Backup & Recovery

### Database Backups
```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
gzip backup_$DATE.sql
aws s3 cp backup_$DATE.sql.gz s3://your-backup-bucket/
```

### Application Backups
- Version control for code
- Environment variable backups
- Configuration file backups
- SSL certificate backups

---

**Remember**: Always test in a staging environment before deploying to production!