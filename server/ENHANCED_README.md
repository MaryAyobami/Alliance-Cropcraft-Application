# Alliance CropCraft - Enhanced Backend API

## Overview
Enhanced backend API for Alliance CropCraft livestock management system. Restructured to be modular while preserving all existing functionality.

## 🏗️ Architecture
```
server/
├── server.js                 # Main server (enhanced)
├── routes/                   # Modular API routes
│   ├── pens.js               # Pen management
│   ├── weights.js            # Weight tracking
│   ├── breeding.js           # Breeding management
│   ├── health.js             # Enhanced health
│   ├── investors.js          # Investor management
│   ├── feed.js               # Feed management
│   ├── notifications.js      # Notifications
│   └── reports.js            # Enhanced reports
├── middleware/               # Auth & validation
└── scripts/                  # Database scripts
```

## 🔧 Setup
```bash
cd server
npm install
node scripts/init-enhanced-schema.js
npm run dev
```

## 📡 New API Endpoints

### Pen Management
- `GET /api/pens` - Get all pens
- `POST /api/pens` - Create pen
- `PUT /api/pens/:id` - Update pen
- `DELETE /api/pens/:id` - Delete pen
- `GET /api/pens/assignments` - Get assignments
- `POST /api/pens/assignments` - Create assignment

### Weight Tracking
- `GET /api/weight-records` - Get records
- `POST /api/weight-records` - Create record
- `GET /api/weight-records/animal/:id` - Get history
- `GET /api/weight-records/alerts` - Get alerts

### Breeding Management
- `GET /api/breeding/events` - Get events
- `POST /api/breeding/events` - Create event
- `GET /api/breeding/pregnancy-checks` - Get checks
- `POST /api/breeding/pregnancy-checks` - Create check
- `GET /api/breeding/births` - Get births
- `POST /api/breeding/births` - Create birth

### Enhanced Health
- `GET /api/health/vaccinations` - Get vaccinations
- `POST /api/health/vaccinations` - Create vaccination
- `GET /api/health/treatments` - Get treatments
- `POST /api/health/treatments` - Create treatment
- `GET /api/health/mortalities` - Get mortalities
- `POST /api/health/mortalities` - Create mortality

### Feed Management
- `GET /api/feed/rations` - Get rations
- `POST /api/feed/rations` - Create ration
- `GET /api/feed/logs` - Get logs
- `POST /api/feed/logs` - Create log
- `GET /api/feed/inventory` - Get inventory

### Investor Management
- `GET /api/investors` - Get investors
- `POST /api/investors` - Create investor
- `GET /api/investors/:id/dashboard` - Get dashboard
- `GET /api/investors/:id/kpis` - Get KPIs
- `GET /api/investors/allocations` - Get allocations

## 🔐 Enhanced Roles
- **Supervisor**: Approve logs, BCS recording
- **Investor**: Read-only portfolio access

## ✅ Status: Production Ready