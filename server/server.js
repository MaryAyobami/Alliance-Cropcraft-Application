const express = require("express")
const cors = require("cors")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { Pool } = require("pg")
const multer = require("multer")
const cron = require("node-cron") 
const cloudinary = require('cloudinary').v2

require("dotenv").config()

const { saveSubscription } = require('./push')

// Import notifications only if the file exists
let notificationSystem = null;
try {
  const notifications = require('./notifications');
  notificationSystem = notifications;
} catch (err) {
  console.warn('Notifications module not found, continuing without it');
}

const app = express()
const port = process.env.PORT || 5000

// Enhanced error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process for unhandled rejections
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  
  // If it's a database connection error, don't crash the server
  if (err.message && (err.message.includes('client_termination') || 
      err.message.includes('Connection terminated') ||
      err.message.includes('shutdown'))) {
    console.error('Database connection issue detected, but server will continue running');
    return;
  }
  
  // For other uncaught exceptions, exit gracefully
  console.error('Fatal error occurred, shutting down...');
  process.exit(1);
});

// Database connection with better error handling and reconnection
const pool = new Pool({
  connectionString: "postgresql://postgres.nobbtyhwmjgfeiwpcduk:bams060704@aws-0-eu-north-1.pooler.supabase.com:5432/postgres",
  ssl: {
    rejectUnauthorized: false,
  },
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
})

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err)
  // Don't exit the process, just log the error
})

// Test database connection with retry logic
const connectWithRetry = async () => {
  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const client = await pool.connect();
      client.release();
      console.log('Database connected successfully');
      return;
    } catch (err) {
      retries++;
      console.error(`Database connection attempt ${retries} failed:`, err.message);
      
      if (retries === maxRetries) {
        console.error('Max database connection retries reached. Server will continue but database operations may fail.');
        return; // Don't exit, let server start
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
    }
  }
}

// Connect to database
connectWithRetry();


// Use memoryStorage for multer (for Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed!"), false)
    }
    cb(null, true)
  }
})


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})


// Middleware
app.use(cors())
app.use(express.json())


// Start the notification system if available
if (notificationSystem && notificationSystem.startNotifications) {
  try {
    notificationSystem.startNotifications();
    console.log('Notification system started');
  } catch (err) {
    console.warn('Failed to start notification system:', err.message);
  }
}

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.sendStatus(401)
  }

  jwt.verify(token, process.env.JWT_SECRET || "your-secret-key", (err, user) => {
    if (err) return res.sendStatus(403)
    req.user = user
    next()
  })
}

// Admin guard
function requireAdmin(req, res, next) {
  const role = req.user?.role
  if (role === 'Admin User' || role === 'Admin') return next()
  return res.status(403).json({ message: 'Admin access required' })
}

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
  }
  
  if (err.message === 'Only image files are allowed!') {
    return res.status(400).json({ message: 'Only image files are allowed' });
  }
  
  res.status(500).json({ message: 'Internal server error' });
});

// Database query wrapper with error handling
const queryWithRetry = async (query, params = []) => {
  const maxRetries = 3;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const result = await pool.query(query, params);
      return result;
    } catch (err) {
      retries++;
      console.error(`Query attempt ${retries} failed:`, err.message);
      
      // If it's a connection error, try to reconnect
      if (err.code === 'ECONNRESET' || err.message.includes('client_termination') || 
          err.message.includes('Connection terminated')) {
        
        if (retries === maxRetries) {
          throw new Error('Database connection lost and could not be restored');
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        continue;
      }
      
      // For other errors, throw immediately
      throw err;
    }
  }
};

// Login endpoint with email verification check
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body
    
    // Enhanced validation
    if (!email || !password) {
      return res.status(400).json({ 
        message: "Email and password are required",
        field: !email ? "email" : "password"
      })
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: "Please enter a valid email address",
        field: "email"
      })
    }
    
    const result = await queryWithRetry("SELECT * FROM users WHERE email = $1", [email])
    const user = result.rows[0]
    
    if (!user) {
      return res.status(401).json({ 
        message: "Invalid email or password",
        field: "email"
      })
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ 
        message: "Invalid email or password",
        field: "password"
      })
    }

    // Check if email is verified
    if (!user.email_confirmed_at && !user.confirmed_at) {
      return res.status(401).json({ 
        message: "Please verify your email address before logging in. Check your inbox for a verification link.",
        email_not_verified: true,
        user_email: email
      })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" },
    )

    // Update last login
    await queryWithRetry("UPDATE users SET last_sign_in_at = NOW() WHERE id = $1", [user.id])

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        email_verified: true
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ 
      message: "Login failed. Please try again.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Registration endpoint with proper email verification
app.post("/api/auth/register", async (req, res) => {
  try {
    const { full_name, email, phone, password, role } = req.body

    // Enhanced validation
    if (!full_name || !email || !password) {
      return res.status(400).json({ 
        message: "Full name, email and password are required",
        field: !full_name ? "full_name" : !email ? "email" : "password"
      })
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: "Please enter a valid email address",
        field: "email"
      })
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ 
        message: "Password must be at least 8 characters long",
        field: "password"
      })
    }

    // Check if user exists
    const existingUser = await queryWithRetry("SELECT * FROM users WHERE email = $1", [email])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        message: "An account with this email already exists",
        field: "email"
      })
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12) // Increased salt rounds for better security

    // Generate verification token
    const crypto = require('crypto')
    const verificationToken = crypto.randomBytes(32).toString('hex')

    const result = await queryWithRetry(
      `INSERT INTO users (full_name, email, phone, password_hash, role, confirmation_token, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING id, full_name, email, role`,
      [full_name, email, phone || null, password_hash, role || 'Staff', verificationToken],
    )

    const user = result.rows[0]

    // Send verification email
    if (notificationSystem) {
      try {
        await notificationSystem.SimpleNotifications.sendVerificationEmail(user, verificationToken)
        console.log(`Verification email sent to ${email}`)
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError)
        // Don't fail registration if email fails, but log it
      }
    }

    // Return success without token (user needs to verify email first)
    res.status(201).json({
      message: "Registration successful. Please check your email to verify your account.",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        email_verified: false
      },
      verification_required: true
    })
  } catch (error) {
    console.error("Registration error:", error)
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ 
        message: "An account with this email already exists",
        field: "email"
      })
    }
    
    res.status(500).json({ 
      message: "Registration failed. Please try again.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Send verification email endpoint
app.post("/api/auth/send-verification", async (req, res) => {
  try {
    const { email } = req.body
    
    if (!email) {
      return res.status(400).json({ 
        message: "Email is required",
        field: "email"
      })
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: "Please enter a valid email address",
        field: "email"
      })
    }
    
    // Check if user exists
    const userResult = await queryWithRetry("SELECT * FROM users WHERE email = $1", [email])
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        message: "No account found with this email address",
        field: "email"
      })
    }
    
    const user = userResult.rows[0]
    
    // Check if already verified
    if (user.email_confirmed_at || user.confirmed_at) {
      return res.status(400).json({ 
        message: "This email is already verified"
      })
    }
    
    // Generate new verification token
    const crypto = require('crypto')
    const verificationToken = crypto.randomBytes(32).toString('hex')
    
    // Update token in database
    await queryWithRetry(
      "UPDATE users SET confirmation_token = $1, confirmation_sent_at = NOW() WHERE email = $2",
      [verificationToken, email]
    )
    
    // Send verification email
    if (notificationSystem) {
      try {
        await notificationSystem.SimpleNotifications.sendVerificationEmail(user, verificationToken)
        console.log(`Verification email resent to ${email}`)
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError)
        return res.status(500).json({ 
          message: "Failed to send verification email. Please try again."
        })
      }
    } else {
      console.log(`Verification email would be sent to ${email} with token: ${verificationToken}`)
    }
    
    res.json({ 
      message: "Verification email sent successfully. Please check your inbox and spam folder."
    })
  } catch (error) {
    console.error("Send verification error:", error)
    res.status(500).json({ 
      message: "Failed to send verification email. Please try again.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Verify email endpoint
app.post("/api/auth/verify-email", async (req, res) => {
  try {
    const { token } = req.body
    
    if (!token) {
      return res.status(400).json({ 
        message: "Verification token is required",
        field: "token"
      })
    }
    
    // Find user with this token
    const userResult = await queryWithRetry(
      "SELECT * FROM users WHERE confirmation_token = $1 AND confirmation_token IS NOT NULL",
      [token]
    )
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({ 
        message: "Invalid or expired verification token"
      })
    }
    
    const user = userResult.rows[0]
    
    // Check if token is expired (24 hours)
    if (user.confirmation_sent_at) {
      const tokenAge = Date.now() - new Date(user.confirmation_sent_at).getTime()
      const twentyFourHours = 24 * 60 * 60 * 1000
      
      if (tokenAge > twentyFourHours) {
        return res.status(400).json({ 
          message: "Verification token has expired. Please request a new one.",
          token_expired: true
        })
      }
    }
    
    // Verify the email
    await queryWithRetry(
      `UPDATE users SET 
       email_confirmed_at = NOW(), 
       confirmed_at = NOW(), 
       confirmation_token = NULL, 
       confirmation_sent_at = NULL 
       WHERE id = $1`,
      [user.id]
    )
    
    console.log(`Email verified successfully for user: ${user.email}`)
    
    res.json({ 
      message: "Email verified successfully! You can now log in to your account.",
      verified: true
    })
  } catch (error) {
    console.error("Email verification error:", error)
    res.status(500).json({ 
      message: "Email verification failed. Please try again.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// ...existing imports and setup...

// --- Forgot password endpoint ---
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: "Email is required" })

    // Find user
    const userResult = await pool.query("SELECT id, email, full_name FROM users WHERE email = $1", [email])
    if (userResult.rows.length === 0) {
      // Don't reveal if user exists
      return res.json({ message: "If an account with this email exists, a password reset link has been sent." })
    }
    const user = userResult.rows[0]

    // Generate token
    const crypto = require('crypto')
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 3600000) // 1 hour

    // Store token and expiry in users table
    await pool.query(
      "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3",
      [resetToken, expiresAt, user.id]
    )

    // Send email (implement your own email logic)
    if (notificationSystem) {
      try {
        await notificationSystem.SimpleNotifications.sendPasswordResetEmail(user, resetToken)
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError)
      }
    } else {
      console.log(`Password reset link for ${email}: https://your-app.com/reset-password?token=${resetToken}`)
    }

    res.json({ message: "If an account with this email exists, a password reset link has been sent." })
  } catch (error) {
    console.error("Forgot password error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// --- Reset password endpoint ---
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" })
    }
    if (newPassword.length < 8 || !/[0-9!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      return res.status(400).json({ message: "Password must be at least 8 characters and contain a number or symbol" })
    }

    // Find user by token
    const userResult = await pool.query(
      "SELECT id, reset_token_expires FROM users WHERE reset_token = $1",
      [token]
    )
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" })
    }
    const user = userResult.rows[0]
    if (new Date(user.reset_token_expires) < new Date()) {
      return res.status(400).json({ message: "Token has expired" })
    }

    // Update password and clear token
    const password_hash = await bcrypt.hash(newPassword, 12)
    await pool.query(
      "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2",
      [password_hash, user.id]
    )

    res.json({ message: "Password reset successfully" })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// ...rest of your server code...

// Dashboard routes
app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role
    console.log("User ID:", userId, "Role:", userRole)
    
    // Get today's tasks based on user role
    let todayTasksQuery
    let todayTasksParams

    if (userRole === "Admin User") {
      todayTasksQuery = "SELECT * FROM tasks WHERE due_date = CURRENT_DATE"
      todayTasksParams = []
    } else {
      todayTasksQuery = "SELECT * FROM tasks WHERE assigned_to = $1 AND due_date = CURRENT_DATE"
      todayTasksParams = [userId]
    }

    const todayTasksResult = await pool.query(todayTasksQuery, todayTasksParams)
    const todayTasks = todayTasksResult.rows
    
    const completedTasks = todayTasks.filter((task) => task.status === "completed").length
    const totalTodayTasks = todayTasks.length
    const pendingTasks = totalTodayTasks - completedTasks

    // Get THIS WEEK's tasks (Monday to Sunday)
    let weekTasksQuery
    let weekTasksParams

    if (userRole === "Admin User") {
      weekTasksQuery = `
        SELECT COUNT(*) as count FROM tasks 
        WHERE due_date >= DATE_TRUNC('week', CURRENT_DATE) 
        AND due_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
      `
      weekTasksParams = []
    } else {
      weekTasksQuery = `
        SELECT COUNT(*) as count FROM tasks 
        WHERE assigned_to = $1 
        AND due_date >= DATE_TRUNC('week', CURRENT_DATE) 
        AND due_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
      `
      weekTasksParams = [userId]
    }

    const weekTasksResult = await pool.query(weekTasksQuery, weekTasksParams)
    const thisWeekTasks = Number.parseInt(weekTasksResult.rows[0].count)

    // Get active staff count (for admin)
    const staffResult = await pool.query("SELECT COUNT(*) as count FROM users WHERE role != $1", ["Admin User"])
    const activeStaff = Number.parseInt(staffResult.rows[0].count)

    // Get completion rate (based on today's tasks)
    const completionRate = totalTodayTasks > 0 ? Math.round((completedTasks / totalTodayTasks) * 100) : 0

    res.json({
      completionRate,
      activeStaff,
      thisWeekTasks,
      pendingTasks,
      completedTasks: `${completedTasks}/${totalTodayTasks}`,
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.get("/api/dashboard/tasks", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role

    let query
    let params

    if (userRole === "Admin User") {
      query = `
        SELECT t.*, u.full_name as assigned_name 
        FROM tasks t 
        LEFT JOIN users u ON t.assigned_to = u.id 
        WHERE t.due_date = CURRENT_DATE 
        ORDER BY t.due_time ASC NULLS LAST
      `
      params = []
    } else {
      query = `
        SELECT t.*, u.full_name as assigned_name 
        FROM tasks t 
        LEFT JOIN users u ON t.assigned_to = u.id 
        WHERE t.assigned_to = $1 AND t.due_date = CURRENT_DATE 
        ORDER BY t.due_time ASC NULLS LAST
      `
      params = [userId]
    }

    const result = await pool.query(query, params)

    // Group tasks by time of day - with better null handling
    const morningTasks = result.rows.filter((task) => {
      if (!task.due_time) return false;
      const hour = Number.parseInt(task.due_time.split(":")[0])
      return hour >= 6 && hour < 12
    })

    const afternoonTasks = result.rows.filter((task) => {
      if (!task.due_time) return false;
      const hour = Number.parseInt(task.due_time.split(":")[0])
      return hour >= 12 && hour < 18
    })

    const eveningTasks = result.rows.filter((task) => {
      if (!task.due_time) return true; // No time specified goes to evening
      const hour = Number.parseInt(task.due_time.split(":")[0])
      return hour >= 18 || hour < 6
    })

    res.json({
      morning: morningTasks,
      afternoon: afternoonTasks,
      evening: eveningTasks,
    })
  } catch (error) {
    console.error("Dashboard tasks error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Tasks routes
// --- Scheduled job to reset static tasks' status daily ---
cron.schedule("0 0 * * *", async () => {
  try {
    // Reset status of static, recurrent tasks to 'pending' for today
    await pool.query(`
      UPDATE tasks
      SET status = 'pending'
      WHERE tag = 'static' AND recurrent = true
    `)
    console.log("Static tasks reset to pending for today")
  } catch (err) {
    console.error("Error resetting static tasks:", err)
  }
})

// --- Create Task API: Add tag, recurrent, active_date ---
app.post("/api/tasks", authenticateToken, async (req, res) => {
  try {
    // Check if user has permission to create tasks
    if (!checkTaskAccess(req.user.role, 'create')) {
      return res.status(403).json({ message: 'You do not have permission to create tasks' })
    }

    const {
      title,
      description,
      due_date,
      due_time,
      assigned_to,
      priority,
      tag, // "static" or "dynamic"
      recurrent, // boolean
      active_date // for dynamic tasks
    } = req.body
    const created_by = req.user.id

    // Enhanced validation
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        message: "Task title is required",
        field: "title"
      })
    }

    if (title.length > 100) {
      return res.status(400).json({ 
        message: "Task title must be less than 100 characters",
        field: "title"
      })
    }

    if (!due_date) {
      return res.status(400).json({ 
        message: "Due date is required",
        field: "due_date"
      })
    }

    // Validate due date format and not in past
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(due_date)) {
      return res.status(400).json({ 
        message: "Due date must be in YYYY-MM-DD format",
        field: "due_date"
      })
    }

    const selectedDate = new Date(due_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (selectedDate < today) {
      return res.status(400).json({ 
        message: "Due date cannot be in the past",
        field: "due_date"
      })
    }

    if (!assigned_to) {
      return res.status(400).json({ 
        message: "Please assign the task to someone",
        field: "assigned_to"
      })
    }

    // Verify assigned user exists
    const userCheck = await queryWithRetry("SELECT id FROM users WHERE id = $1", [assigned_to])
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ 
        message: "Assigned user does not exist",
        field: "assigned_to"
      })
    }

    if (!tag || !["static", "dynamic"].includes(tag)) {
      return res.status(400).json({ 
        message: "Task type must be either 'static' or 'dynamic'",
        field: "tag"
      })
    }

    if (description && description.length > 500) {
      return res.status(400).json({ 
        message: "Description must be less than 500 characters",
        field: "description"
      })
    }

    if (priority && !["high", "medium", "low"].includes(priority.toLowerCase())) {
      return res.status(400).json({ 
        message: "Priority must be 'high', 'medium', or 'low'",
        field: "priority"
      })
    }

    // Validate time format if provided
    if (due_time) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(due_time)) {
        return res.status(400).json({ 
          message: "Due time must be in HH:MM format",
          field: "due_time"
        })
      }
    }

    let finalRecurrent = tag === "static" ? true : false
    let finalActiveDate = tag === "dynamic" ? (active_date || due_date) : null

    const result = await queryWithRetry(
      `INSERT INTO tasks 
       (title, description, due_date, due_time, assigned_to, priority, created_by, status, tag, recurrent, active_date, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) RETURNING *`,
      [
        title.trim(),
        description ? description.trim() : null,
        due_date,
        due_time || null,
        assigned_to,
        priority ? priority.toLowerCase() : 'medium',
        created_by,
        'pending',
        tag,
        finalRecurrent,
        finalActiveDate
      ]
    )

    const createdTask = result.rows[0]

    // Send notification to assigned user if notification system is available
    if (notificationSystem && assigned_to !== created_by) {
      try {
        const assignedUser = await queryWithRetry("SELECT * FROM users WHERE id = $1", [assigned_to])
        const createdByUser = await queryWithRetry("SELECT * FROM users WHERE id = $1", [created_by])
        
        if (assignedUser.rows.length > 0 && createdByUser.rows.length > 0) {
          await notificationSystem.SimpleNotifications.sendTaskAssignment(
            assignedUser.rows[0], 
            createdByUser.rows[0], 
            createdTask
          )
        }
      } catch (notifError) {
        console.error("Failed to send task assignment notification:", notifError)
        // Don't fail task creation if notification fails
      }
    }

    res.status(201).json({ 
      message: 'Task created successfully', 
      task: createdTask 
    })
  } catch (error) {
    console.error("Create task error:", error)
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ 
        message: "A task with similar details already exists"
      })
    }
    
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ 
        message: "Invalid user assignment",
        field: "assigned_to"
      })
    }
    
    res.status(500).json({ 
      message: "Failed to create task. Please try again.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// --- Get Tasks API: Only return today's relevant tasks ---
app.get("/api/tasks", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role

    let query
    let params

    // Only fetch tasks for today:
    // - Static tasks (tag='static', recurrent=true)
    // - Dynamic tasks (tag='dynamic', active_date=today)
    if (userRole === "Admin User") {
      query = `
        SELECT t.*, u.full_name as assigned_name 
        FROM tasks t 
        LEFT JOIN users u ON t.assigned_to = u.id 
        WHERE 
          (t.tag = 'static' AND t.recurrent = true)
          OR
          (t.tag = 'dynamic' AND t.active_date = CURRENT_DATE)
        ORDER BY t.created_at DESC
      `
      params = []
    } else {
      query = `
        SELECT t.*, u.full_name as assigned_name 
        FROM tasks t 
        LEFT JOIN users u ON t.assigned_to = u.id 
        WHERE 
          t.assigned_to = $1 AND (
            (t.tag = 'static' AND t.recurrent = true)
            OR
            (t.tag = 'dynamic' AND t.active_date = CURRENT_DATE)
          )
        ORDER BY t.created_at DESC
      `
      params = [userId]
    }

    const result = await pool.query(query, params)
    res.json({ data: result.rows })
  } catch (error) {
    console.error("Get tasks error:", error)
    res.status(500).json({ message: "Server error" })
  }
  })

// Complete task with evidence upload
app.post("/api/tasks/:id/complete-with-evidence", authenticateToken, async (req, res) => {
  try {
      if (!req.file) return res.status(400).json({ message: "No image provided" })

    // Upload to Cloudinary using buffer
    cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "evidence" },
      async (error, cloudRes) => {
        if (error) return res.status(500).json({ message: "Cloudinary upload failed" })
        // Save cloudRes.secure_url to DB
        await pool.query(
          "UPDATE tasks SET status='completed', evidence_photo=$1 WHERE id=$2",
          [cloudRes.secure_url, req.params.id]
        )
        res.json({ message: "Task completed with evidence", url: cloudRes.secure_url })
      }
    ).end(req.file.buffer)  
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// Get task history for the current week
app.get("/api/tasks/history/weekly", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role

    let query
    let params

    // Get tasks for the current week (Monday to Sunday)
    if (userRole === "Admin User") {
      query = `
        SELECT t.*, u.full_name as assigned_name 
        FROM tasks t 
        LEFT JOIN users u ON t.assigned_to = u.id 
        WHERE 
          (t.tag = 'static' AND t.recurrent = true)
          OR
          (t.tag = 'dynamic' AND t.active_date >= date_trunc('week', CURRENT_DATE) AND t.active_date < date_trunc('week', CURRENT_DATE) + interval '7 days')
        ORDER BY t.created_at DESC
      `
      params = []
    } else {
      query = `
        SELECT t.*, u.full_name as assigned_name 
        FROM tasks t 
        LEFT JOIN users u ON t.assigned_to = u.id 
        WHERE 
          t.assigned_to = $1 AND (
            (t.tag = 'static' AND t.recurrent = true)
            OR
            (t.tag = 'dynamic' AND t.active_date >= date_trunc('week', CURRENT_DATE) AND t.active_date < date_trunc('week', CURRENT_DATE) + interval '7 days')
          )
        ORDER BY t.created_at DESC
      `
      params = [userId]
    }

    const result = await pool.query(query, params)
    res.json({ data: result.rows })
  } catch (error) {
    console.error("Get task history error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get task history for a specific week
app.get("/api/tasks/history/:week", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role
    const week = req.params.week

    let query
    let params

    // Parse week parameter (format: YYYY-WW)
    let startDate, endDate
    if (week === "current") {
      startDate = "date_trunc('week', CURRENT_DATE)"
      endDate = "date_trunc('week', CURRENT_DATE) + interval '7 days'"
    } else {
      // Parse week format like "2024-01" (year-week)
      const [year, weekNum] = week.split('-')
      if (!year || !weekNum) {
        return res.status(400).json({ message: "Invalid week format. Use YYYY-WW or 'current'" })
      }
      startDate = `date_trunc('week', to_date('${year}-01-01', 'YYYY-MM-DD') + (${weekNum} - 1) * interval '7 days')`
      endDate = `date_trunc('week', to_date('${year}-01-01', 'YYYY-MM-DD') + (${weekNum} - 1) * interval '7 days') + interval '7 days'`
    }

    if (userRole === "Admin User") {
      query = `
        SELECT t.*, u.full_name as assigned_name 
        FROM tasks t 
        LEFT JOIN users u ON t.assigned_to = u.id 
        WHERE 
          (t.tag = 'static' AND t.recurrent = true)
          OR
          (t.tag = 'dynamic' AND t.active_date >= ${startDate} AND t.active_date < ${endDate})
        ORDER BY t.created_at DESC
      `
      params = []
    } else {
      query = `
        SELECT t.*, u.full_name as assigned_name 
        FROM tasks t 
        LEFT JOIN users u ON t.assigned_to = u.id 
        WHERE 
          t.assigned_to = $1 AND (
            (t.tag = 'static' AND t.recurrent = true)
            OR
            (t.tag = 'dynamic' AND t.active_date >= ${startDate} AND t.active_date < ${endDate})
          )
        ORDER BY t.created_at DESC
      `
      params = [userId]
    }

    const result = await pool.query(query, params)
    res.json({ data: result.rows })
  } catch (error) {
    console.error("Get task history error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get task details
app.get("/api/tasks/:id/details", authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id
    
    const query = `
      SELECT t.*, 
             u.full_name as assigned_name,
             c.full_name as created_by_name
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      LEFT JOIN users c ON t.created_by = c.id
      WHERE t.id = $1 AND (t.assigned_to = $2 OR $3 = 'Admin User' OR t.created_by = $2)
    `
    
    const result = await pool.query(query, [taskId, req.user.id, req.user.role])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Task not found or no permission" })
    }

    const task = result.rows[0]
    
    // Add full evidence photo URL if exists
    if (task.evidence_photo) {
      task.evidence_photo_url = `${req.protocol}://${req.get('host')}/uploads/evidence/${task.evidence_photo}`
    }

    res.json({ data: task })
  } catch (error) {
    console.error("Get task details error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Original complete task endpoint (kept for backward compatibility)
app.put("/api/tasks/:id/complete", authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id

    const result = await pool.query(
      "UPDATE tasks SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2 AND (assigned_to = $3 OR $4 = 'Admin User') RETURNING *",
      ["completed", taskId, req.user.id, req.user.role],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Task not found or no permission" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Complete task error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update task (Admin and Farm Manager only)
app.put("/api/tasks/:id", authenticateToken, async (req, res) => {
  try {
    if (!checkTaskAccess(req.user.role, 'update')) {
      return res.status(403).json({ message: 'You do not have permission to update tasks' })
    }

    const taskId = req.params.id
    const { title, description, due_date, due_time, assigned_to, priority, tag, recurrent, active_date } = req.body

    // Enhanced validation
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        message: "Task title is required",
        field: "title"
      })
    }

    if (title.length > 100) {
      return res.status(400).json({ 
        message: "Task title must be less than 100 characters",
        field: "title"
      })
    }

    if (!due_date) {
      return res.status(400).json({ 
        message: "Due date is required",
        field: "due_date"
      })
    }

    if (!assigned_to) {
      return res.status(400).json({ 
        message: "Please assign the task to someone",
        field: "assigned_to"
      })
    }

    // Verify assigned user exists
    const userCheck = await queryWithRetry("SELECT id FROM users WHERE id = $1", [assigned_to])
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ 
        message: "Assigned user does not exist",
        field: "assigned_to"
      })
    }

    const result = await pool.query(
      `UPDATE tasks SET 
        title = $1, 
        description = $2, 
        due_date = $3, 
        due_time = $4, 
        assigned_to = $5, 
        priority = $6, 
        tag = $7, 
        recurrent = $8, 
        active_date = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 RETURNING *`,
      [title, description, due_date, due_time, assigned_to, priority || 'medium', tag || 'static', recurrent !== false, active_date, taskId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Update task error:", error)
    res.status(500).json({ message: "Failed to update task" })
  }
})

// Delete task (Admin and Farm Manager only)
app.delete("/api/tasks/:id", authenticateToken, async (req, res) => {
  try {
    if (!checkTaskAccess(req.user.role, 'delete')) {
      return res.status(403).json({ message: 'You do not have permission to delete tasks' })
    }

    const taskId = req.params.id
    const result = await pool.query("DELETE FROM tasks WHERE id = $1 RETURNING *", [taskId])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" })
    }

    res.json({ message: "Task deleted successfully" })
  } catch (error) {
    console.error("Delete task error:", error)
    res.status(500).json({ message: "Failed to delete task" })
  }
})

// Events routes
app.get("/api/events", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM events ORDER BY event_date ASC, event_time ASC")
    res.json(result.rows)
  } catch (error) {
    console.error("Get events error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/api/events", authenticateToken, async (req, res) => {
  try {
    const { title, description, event_date, event_time, location, type, priority } = req.body
    const created_by = req.user.id

    // Enhanced validation
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        message: "Event title is required",
        field: "title"
      })
    }

    if (title.length > 100) {
      return res.status(400).json({ 
        message: "Event title must be less than 100 characters",
        field: "title"
      })
    }

    if (!event_date) {
      return res.status(400).json({ 
        message: "Event date is required",
        field: "event_date"
      })
    }

    // Validate event date format and not in past
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(event_date)) {
      return res.status(400).json({ 
        message: "Event date must be in YYYY-MM-DD format",
        field: "event_date"
      })
    }

    const selectedDate = new Date(event_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (selectedDate < today) {
      return res.status(400).json({ 
        message: "Event date cannot be in the past",
        field: "event_date"
      })
    }

    if (description && description.length > 500) {
      return res.status(400).json({ 
        message: "Description must be less than 500 characters",
        field: "description"
      })
    }

    if (location && location.length > 100) {
      return res.status(400).json({ 
        message: "Location must be less than 100 characters",
        field: "location"
      })
    }

    if (type && !["Task", "Meeting", "Appointment", "Reminder", "Other"].includes(type)) {
      return res.status(400).json({ 
        message: "Event type must be one of: Task, Meeting, Appointment, Reminder, Other",
        field: "type"
      })
    }

    if (priority && !["high", "medium", "low"].includes(priority.toLowerCase())) {
      return res.status(400).json({ 
        message: "Priority must be 'high', 'medium', or 'low'",
        field: "priority"
      })
    }

    // Validate time format if provided
    if (event_time) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(event_time)) {
        return res.status(400).json({ 
          message: "Event time must be in HH:MM format",
          field: "event_time"
        })
      }
    }

    const result = await queryWithRetry(
      `INSERT INTO events 
       (title, description, event_date, event_time, location, type, priority, created_by, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [
        title.trim(),
        description ? description.trim() : null,
        event_date,
        event_time || null,
        location ? location.trim() : null,
        type || "Task",
        priority ? priority.toLowerCase() : "medium",
        created_by
      ],
    )

    const createdEvent = result.rows[0]

    // Send notification about the new event if notification system is available
    if (notificationSystem) {
      try {
        const createdByUser = await queryWithRetry("SELECT * FROM users WHERE id = $1", [created_by])
        
        if (createdByUser.rows.length > 0) {
          await notificationSystem.SimpleNotifications.sendEventNotification(
            createdByUser.rows[0], 
            createdEvent
          )
        }
      } catch (notifError) {
        console.error("Failed to send event notification:", notifError)
        // Don't fail event creation if notification fails
      }
    }

    res.status(201).json({
      message: "Event created successfully",
      event: createdEvent
    })
  } catch (error) {
    console.error("Create event error:", error)
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ 
        message: "An event with similar details already exists"
      })
    }
    
    res.status(500).json({ 
      message: "Failed to create event. Please try again.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Update an event
app.put("/api/events/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, event_date, event_time, location, type, priority } = req.body

    const result = await pool.query(
      `UPDATE events SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        event_date = COALESCE($3, event_date),
        event_time = COALESCE($4, event_time),
        location = COALESCE($5, location),
        type = COALESCE($6, type),
        priority = COALESCE($7, priority)
      WHERE id = $8 RETURNING *`,
      [title || null, description || null, event_date || null, event_time || null, location || null, type || null, priority || null, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Event not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Update event error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete an event
app.delete("/api/events/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query("DELETE FROM events WHERE id = $1 RETURNING id", [id])
    if (result.rows.length === 0) return res.status(404).json({ message: "Event not found" })
    res.json({ success: true })
  } catch (error) {
    console.error("Delete event error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Reports routes
app.get("/api/reports/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { start, end } = req.query
    let where = " WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' "
    let params = []
    if (start && end) {
      where = " WHERE created_at BETWEEN $1 AND $2 "
      params = [start, end]
    }

    // Task completion rate over range
    const completionResult = await pool.query(
      `SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks
      FROM tasks ${where}`,
      params
    )

    const { total_tasks, completed_tasks } = completionResult.rows[0]
    const completionRate = total_tasks > 0 ? ((completed_tasks / total_tasks) * 100).toFixed(1) : 0

    // Get real livestock count (excluding deceased)
    const livestockResult = await pool.query(
      "SELECT COUNT(*) as count FROM livestock WHERE health_status != 'deceased'"
    )
    const activeLivestock = Number.parseInt(livestockResult.rows[0].count)

    // Calculate staff efficiency based on task completion rates
    const staffEfficiencyResult = await pool.query(
      `SELECT 
        ROUND(AVG(CASE WHEN status = 'completed' THEN 100 ELSE 0 END), 1) as efficiency
      FROM tasks 
      WHERE assigned_to IS NOT NULL ${where.replace('created_at', 'due_date')}`,
      params
    )
    const staffEfficiency = Number.parseFloat(staffEfficiencyResult.rows[0].efficiency) || 0

    // Calculate productivity score as monthly revenue placeholder
    // This could be replaced with actual revenue data if available
    const productivityResult = await pool.query(
      `SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(*) as total
      FROM tasks 
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`
    )
    const { completed: monthlyCompleted, total: monthlyTotal } = productivityResult.rows[0]
    const monthlyRevenue = monthlyTotal > 0 ? 
      Number.parseFloat(((monthlyCompleted / monthlyTotal) * 50).toFixed(1)) : 0 // Scaled to represent productivity

    res.json({
      taskCompletionRate: Number.parseFloat(completionRate),
      activeLivestock,
      staffEfficiency,
      monthlyRevenue,
    })
  } catch (error) {
    console.error("Reports stats error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.get("/api/reports/staff-performance", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { start, end } = req.query
    let dateFilter = ""
    let params = []
    if (start && end) {
      dateFilter = " AND t.created_at BETWEEN $1 AND $2 "
      params = [start, end]
    }

    const result = await pool.query(
      `SELECT 
        u.id,
        u.full_name,
        u.role,
        COUNT(t.id) as tasks_completed,
        ROUND(AVG(CASE WHEN t.status = 'completed' THEN 100 ELSE 0 END), 1) as efficiency
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to ${dateFilter}
      WHERE u.role != 'Admin User'
      GROUP BY u.id, u.full_name, u.role
      ORDER BY tasks_completed DESC
      LIMIT 5`,
      params
    )

    res.json(result.rows)
  } catch (error) {
    console.error("Staff performance error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Export CSV
app.get('/api/reports/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { start, end } = req.query
    const lines = [
      ["Metric","Value"],
      ["TaskCompletionRate","72%"],
      ["ActiveLivestock","373"],
      ["StaffEfficiency","91.2%"],
      ["MonthlyRevenue","$22.8k"],
    ]
    if (start || end) {
      lines.push(["Start", start || ""])
      lines.push(["End", end || ""])
    }
    const csv = lines.map(r => r.join(',')).join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=report.csv')
    res.send(csv)
  } catch (error) {
    console.error('Export report error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Users routes
app.get("/api/users", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, full_name, email, role, phone FROM users ORDER BY full_name")
    res.json(result.rows)
  } catch (error) {
    console.error("Get users error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.get("/api/users/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const result = await pool.query("SELECT id, full_name, email, phone, avatar, notif_push role FROM users WHERE id = $1", [userId])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.put("/api/users/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { full_name, email, phone } = req.body

    if (!full_name || !email) {
      return res.status(400).json({ message: "Full name and email are required" })
    }

    const result = await pool.query(
      "UPDATE users SET full_name = $1, email = $2, phone = $3 WHERE id = $4 RETURNING id, full_name, email, phone, role",
      [full_name, email, phone || null, userId],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Update profile error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/api/users", authenticateToken, async (req, res) => {
  try {
    // Check permissions - only Admin and Farm Manager can create users
    if (!["Admin", "Farm Manager"].includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to create users" })
    }

    const { full_name, email, phone, password, role } = req.body

    // Define external user roles that don't need passwords or email verification
    const externalRoles = ["Vendor", "Contractor", "Visitor", "Other"]
    const isExternalUser = externalRoles.includes(role)

    // Validation based on user type
    if (!full_name) {
      return res.status(400).json({ message: "Full name is required" })
    }
    
    if (!isExternalUser) {
      // Staff users need email and password
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required for staff users" })
      }
    }

    // Check if user exists (only if email is provided)
    if (email) {
      const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email])
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: "User with this email already exists" })
      }
    }

    let password_hash = null
    if (password) {
      // Hash password if provided
      password_hash = await bcrypt.hash(password, 10)
    }

    // Create user with optional email verification for external users
    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, email_confirmed_at) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, full_name, email, role, phone`,
      [
        full_name, 
        email || null, 
        phone || null, 
        password_hash, 
        role || 'Staff',
        isExternalUser ? new Date() : null // Auto-verify external users
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Create user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.put("/api/users/:id", authenticateToken, async (req, res) => {
  try {
    // Check permissions - only Admin and Farm Manager can update users
    if (!["Admin", "Farm Manager"].includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to update users" })
    }

    const userId = req.params.id
    const { full_name, email, phone, role, password } = req.body

    // Define external user roles that don't need passwords or email verification
    const externalRoles = ["Vendor", "Contractor", "Visitor", "Other"]
    const isExternalUser = externalRoles.includes(role)

    // Validation based on user type
    if (!full_name) {
      return res.status(400).json({ message: "Full name is required" })
    }
    
    if (!isExternalUser && !email) {
      return res.status(400).json({ message: "Email is required for staff users" })
    }

    // Build update query dynamically based on provided fields
    let updateFields = []
    let values = []
    let paramIndex = 1

    updateFields.push(`full_name = $${paramIndex++}`)
    values.push(full_name)

    if (email) {
      updateFields.push(`email = $${paramIndex++}`)
      values.push(email)
    }

    updateFields.push(`phone = $${paramIndex++}`)
    values.push(phone || null)

    if (role) {
      updateFields.push(`role = $${paramIndex++}`)
      values.push(role)
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      updateFields.push(`password = $${paramIndex++}`)
      values.push(hashedPassword)
    }

    values.push(userId) // for WHERE clause
    
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING id, full_name, email, role, phone, created_at`
    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Update user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.delete("/api/users/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id

    // Prevent deleting yourself
    if (userId === req.user.id.toString()) {
      return res.status(400).json({ message: "Cannot delete your own account" })
    }

    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [userId])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Delete user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/api/users/avatar", authenticateToken, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" })
    cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "avatars" },
      async (error, result) => {
        if (error) return res.status(500).json({ error: "Cloudinary upload failed" })
        await pool.query("UPDATE users SET avatar = $1 WHERE id = $2", [result.secure_url, req.user.id])
        res.json({ avatar: result.secure_url })
      }
    ).end(req.file.buffer)
  } catch (err) {
    res.status(500).json({ error: "Failed to upload avatar" })
  }
})

// --- 4. Change Password ---
app.put("/api/users/password", authenticateToken, async (req, res) => {
  const { current, new: newPassword, confirm } = req.body
  if (newPassword !== confirm) return res.status(400).json({ error: "Passwords do not match" })
  try {
    const result = await pool.query("SELECT password FROM users WHERE id = $1", [req.user.id])
    const valid = await bcrypt.compare(current, result.rows[0].password)
    if (!valid) return res.status(400).json({ error: "Current password incorrect" })
    const hashed = await bcrypt.hash(newPassword, 10)
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashed, req.user.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: "Failed to change password" })
  }
})

// Add notification routes if available
if (notificationSystem && notificationSystem.getNotificationRoutes) {
  try {
    app.use('/api/notifications', notificationSystem.getNotificationRoutes());
  } catch (err) {
    console.warn('Failed to add notification routes:', err.message);
  }
}

// --- 5. Update Notification Preferences ---
app.put("/api/users/notifications", authenticateToken, async (req, res) => {
  const { push, email, morningTime, eveningTime } = req.body
  try {
    await pool.query(
      "UPDATE users SET notif_push = $1, notif_email = $2, notif_morning = $3, notif_evening = $4 WHERE id = $5",
      [push, email, morningTime, eveningTime, req.user.id]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: "Failed to update notification settings" })
  }
})

// Save push subscription from frontend
app.post('/api/notifications/subscribe', authenticateToken, async (req, res) => {
  try {
    await saveSubscription(req.user.id, req.body)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save subscription' })
  }
})

// Livestock API endpoints
// Role-based access helper for livestock
const checkLivestockAccess = (userRole, operation) => {
  const permissions = {
    'Admin': ['view', 'create', 'update', 'delete'],
    'Farm Manager': ['view', 'create', 'update', 'delete'],
    'Veterinary Doctor': ['view', 'update'],
    'Pasture Manager': ['view'],
    'Staff': ['view'],
    'Farm Attendant': ['view'],
    'Maintenance Officer': ['view'],
    'Field Production Officer': ['view']
  }
  
  return permissions[userRole]?.includes(operation) || false
}

// Role-based access helper for tasks
const checkTaskAccess = (userRole, operation) => {
  const permissions = {
    'Admin': ['view', 'create', 'update', 'delete'],
    'Farm Manager': ['view', 'create', 'update', 'delete'],
    'Veterinary Doctor': ['view'],
    'Pasture Manager': ['view'],
    'Staff': ['view'],
    'Farm Attendant': ['view'],
    'Maintenance Officer': ['view'],
    'Field Production Officer': ['view']
  }
  
  return permissions[userRole]?.includes(operation) || false
}

// Get all livestock (all users can view)
app.get("/api/livestock", authenticateToken, async (req, res) => {
  try {
    if (!checkLivestockAccess(req.user.role, 'view')) {
      return res.status(403).json({ 
        message: "You don't have permission to view livestock data"
      })
    }

    const result = await queryWithRetry(`
      SELECT l.*, u.full_name as created_by_name 
      FROM livestock l 
      LEFT JOIN users u ON l.created_by = u.id 
      ORDER BY l.created_at DESC
    `)

    res.json(result.rows)
  } catch (error) {
    console.error("Get livestock error:", error)
    res.status(500).json({ 
      message: "Failed to fetch livestock data",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Get single livestock by ID
app.get("/api/livestock/:id", authenticateToken, async (req, res) => {
  try {
    if (!checkLivestockAccess(req.user.role, 'view')) {
      return res.status(403).json({ 
        message: "You don't have permission to view livestock data"
      })
    }

    const { id } = req.params
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        message: "Invalid livestock ID",
        field: "id"
      })
    }

    const result = await queryWithRetry(`
      SELECT l.*, u.full_name as created_by_name 
      FROM livestock l 
      LEFT JOIN users u ON l.created_by = u.id 
      WHERE l.id = $1
    `, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: "Livestock not found"
      })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Get livestock by ID error:", error)
    res.status(500).json({ 
      message: "Failed to fetch livestock data",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Create new livestock (Admin and Farm Manager only)
app.post("/api/livestock", authenticateToken, async (req, res) => {
  try {
    if (!checkLivestockAccess(req.user.role, 'create')) {
      return res.status(403).json({ 
        message: "You don't have permission to create livestock records"
      })
    }

    const {
      name,
      species,
      breed,
      age,
      weight,
      gender,
      health_status,
      location,
      acquisition_date,
      identification_number,
      vaccination_records,
      medical_history,
      feeding_schedule,
      notes,
      photos
    } = req.body

    // Enhanced validation
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        message: "Animal name is required",
        field: "name"
      })
    }

    if (name.length > 100) {
      return res.status(400).json({ 
        message: "Animal name must be less than 100 characters",
        field: "name"
      })
    }

    if (!species || !species.trim()) {
      return res.status(400).json({ 
        message: "Species is required",
        field: "species"
      })
    }

    if (species.length > 50) {
      return res.status(400).json({ 
        message: "Species must be less than 50 characters",
        field: "species"
      })
    }

    if (age && (age < 0 || age > 50)) {
      return res.status(400).json({ 
        message: "Age must be between 0 and 50 years",
        field: "age"
      })
    }

    if (weight && (weight < 0 || weight > 10000)) {
      return res.status(400).json({ 
        message: "Weight must be between 0 and 10,000 kg",
        field: "weight"
      })
    }

    if (gender && !['male', 'female'].includes(gender.toLowerCase())) {
      return res.status(400).json({ 
        message: "Gender must be 'male' or 'female'",
        field: "gender"
      })
    }

    if (health_status && !['healthy', 'sick', 'quarantine', 'deceased'].includes(health_status.toLowerCase())) {
      return res.status(400).json({ 
        message: "Health status must be one of: healthy, sick, quarantine, deceased",
        field: "health_status"
      })
    }

    if (acquisition_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(acquisition_date)) {
        return res.status(400).json({ 
          message: "Acquisition date must be in YYYY-MM-DD format",
          field: "acquisition_date"
        })
      }

      const selectedDate = new Date(acquisition_date)
      const today = new Date()
      
      if (selectedDate > today) {
        return res.status(400).json({ 
          message: "Acquisition date cannot be in the future",
          field: "acquisition_date"
        })
      }
    }

    if (identification_number && identification_number.length > 50) {
      return res.status(400).json({ 
        message: "Identification number must be less than 50 characters",
        field: "identification_number"
      })
    }

    const result = await queryWithRetry(`
      INSERT INTO livestock (
        name, species, breed, age, weight, gender, health_status, location,
        acquisition_date, identification_number, vaccination_records, medical_history,
        feeding_schedule, notes, photos, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      RETURNING *
    `, [
      name.trim(),
      species.trim(),
      breed ? breed.trim() : null,
      age || null,
      weight || null,
      gender ? gender.toLowerCase() : null,
      health_status ? health_status.toLowerCase() : 'healthy',
      location ? location.trim() : null,
      acquisition_date || null,
      identification_number ? identification_number.trim() : null,
      vaccination_records ? JSON.stringify(vaccination_records) : '[]',
      medical_history ? JSON.stringify(medical_history) : '[]',
      feeding_schedule ? feeding_schedule.trim() : null,
      notes ? notes.trim() : null,
      photos ? photos : null,
      req.user.id
    ])

    res.status(201).json({
      message: "Livestock record created successfully",
      livestock: result.rows[0]
    })
  } catch (error) {
    console.error("Create livestock error:", error)
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ 
        message: "Identification number already exists",
        field: "identification_number"
      })
    }
    
    res.status(500).json({ 
      message: "Failed to create livestock record",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Update livestock (Admin, Farm Manager, and Veterinary Doctor)
app.put("/api/livestock/:id", authenticateToken, async (req, res) => {
  try {
    if (!checkLivestockAccess(req.user.role, 'update')) {
      return res.status(403).json({ 
        message: "You don't have permission to update livestock records"
      })
    }

    const { id } = req.params
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        message: "Invalid livestock ID",
        field: "id"
      })
    }

    // Check if livestock exists
    const existingResult = await queryWithRetry("SELECT id FROM livestock WHERE id = $1", [id])
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ 
        message: "Livestock not found"
      })
    }

    const {
      name,
      species,
      breed,
      age,
      weight,
      gender,
      health_status,
      location,
      acquisition_date,
      identification_number,
      vaccination_records,
      medical_history,
      feeding_schedule,
      notes,
      photos
    } = req.body

    // Build dynamic update query
    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ 
          message: "Animal name cannot be empty",
          field: "name"
        })
      }
      updateFields.push(`name = $${paramIndex}`)
      updateValues.push(name.trim())
      paramIndex++
    }

    if (species !== undefined) {
      if (!species.trim()) {
        return res.status(400).json({ 
          message: "Species cannot be empty",
          field: "species"
        })
      }
      updateFields.push(`species = $${paramIndex}`)
      updateValues.push(species.trim())
      paramIndex++
    }

    if (breed !== undefined) {
      updateFields.push(`breed = $${paramIndex}`)
      updateValues.push(breed ? breed.trim() : null)
      paramIndex++
    }

    if (age !== undefined) {
      if (age && (age < 0 || age > 50)) {
        return res.status(400).json({ 
          message: "Age must be between 0 and 50 years",
          field: "age"
        })
      }
      updateFields.push(`age = $${paramIndex}`)
      updateValues.push(age || null)
      paramIndex++
    }

    if (weight !== undefined) {
      if (weight && (weight < 0 || weight > 10000)) {
        return res.status(400).json({ 
          message: "Weight must be between 0 and 10,000 kg",
          field: "weight"
        })
      }
      updateFields.push(`weight = $${paramIndex}`)
      updateValues.push(weight || null)
      paramIndex++
    }

    if (gender !== undefined) {
      if (gender && !['male', 'female'].includes(gender.toLowerCase())) {
        return res.status(400).json({ 
          message: "Gender must be 'male' or 'female'",
          field: "gender"
        })
      }
      updateFields.push(`gender = $${paramIndex}`)
      updateValues.push(gender ? gender.toLowerCase() : null)
      paramIndex++
    }

    if (health_status !== undefined) {
      if (health_status && !['healthy', 'sick', 'quarantine', 'deceased'].includes(health_status.toLowerCase())) {
        return res.status(400).json({ 
          message: "Health status must be one of: healthy, sick, quarantine, deceased",
          field: "health_status"
        })
      }
      updateFields.push(`health_status = $${paramIndex}`)
      updateValues.push(health_status ? health_status.toLowerCase() : 'healthy')
      paramIndex++
    }

    if (location !== undefined) {
      updateFields.push(`location = $${paramIndex}`)
      updateValues.push(location ? location.trim() : null)
      paramIndex++
    }

    if (acquisition_date !== undefined) {
      if (acquisition_date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(acquisition_date)) {
          return res.status(400).json({ 
            message: "Acquisition date must be in YYYY-MM-DD format",
            field: "acquisition_date"
          })
        }
      }
      updateFields.push(`acquisition_date = $${paramIndex}`)
      updateValues.push(acquisition_date || null)
      paramIndex++
    }

    if (identification_number !== undefined) {
      updateFields.push(`identification_number = $${paramIndex}`)
      updateValues.push(identification_number ? identification_number.trim() : null)
      paramIndex++
    }

    if (vaccination_records !== undefined) {
      updateFields.push(`vaccination_records = $${paramIndex}`)
      updateValues.push(vaccination_records ? JSON.stringify(vaccination_records) : '[]')
      paramIndex++
    }

    if (medical_history !== undefined) {
      updateFields.push(`medical_history = $${paramIndex}`)
      updateValues.push(medical_history ? JSON.stringify(medical_history) : '[]')
      paramIndex++
    }

    if (feeding_schedule !== undefined) {
      updateFields.push(`feeding_schedule = $${paramIndex}`)
      updateValues.push(feeding_schedule ? feeding_schedule.trim() : null)
      paramIndex++
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`)
      updateValues.push(notes ? notes.trim() : null)
      paramIndex++
    }

    if (photos !== undefined) {
      updateFields.push(`photos = $${paramIndex}`)
      updateValues.push(photos || null)
      paramIndex++
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ 
        message: "No fields provided for update"
      })
    }

    // Add updated_at field
    updateFields.push(`updated_at = NOW()`)
    
    // Add the ID parameter
    updateValues.push(id)

    const query = `
      UPDATE livestock 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *
    `

    const result = await queryWithRetry(query, updateValues)

    res.json({
      message: "Livestock record updated successfully",
      livestock: result.rows[0]
    })
  } catch (error) {
    console.error("Update livestock error:", error)
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ 
        message: "Identification number already exists",
        field: "identification_number"
      })
    }
    
    res.status(500).json({ 
      message: "Failed to update livestock record",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Delete livestock (Admin and Farm Manager only)
app.delete("/api/livestock/:id", authenticateToken, async (req, res) => {
  try {
    if (!checkLivestockAccess(req.user.role, 'delete')) {
      return res.status(403).json({ 
        message: "You don't have permission to delete livestock records"
      })
    }

    const { id } = req.params
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        message: "Invalid livestock ID",
        field: "id"
      })
    }

    // Check if livestock exists
    const existingResult = await queryWithRetry("SELECT * FROM livestock WHERE id = $1", [id])
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ 
        message: "Livestock not found"
      })
    }

    await queryWithRetry("DELETE FROM livestock WHERE id = $1", [id])

    res.json({
      message: "Livestock record deleted successfully"
    })
  } catch (error) {
    console.error("Delete livestock error:", error)
    res.status(500).json({ 
      message: "Failed to delete livestock record",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  try {
    await pool.end();
    console.log('Database pool closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  try {
    await pool.end();
    console.log('Database pool closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

// Planting Tracker API
app.get("/api/plantings", authenticateToken, async (req, res) => {
  try {
    const result = await queryWithRetry(
      `SELECT * FROM plantings ORDER BY planting_date DESC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error("Get plantings error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.get("/api/plantings/:id", authenticateToken, async (req, res) => {
  try {
    const plantingId = req.params.id
    const result = await queryWithRetry(
      "SELECT * FROM plantings WHERE id = $1",
      [plantingId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Planting not found" })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error("Get planting error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/api/plantings", authenticateToken, async (req, res) => {
  try {
    // Check permissions - only Admin and Farm Manager can create plantings
    if (!["Admin", "Farm Manager"].includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to create plantings" })
    }

    const { 
      crop_name, 
      variety, 
      planting_date, 
      expected_harvest_date, 
      area_planted, 
      location, 
      growth_stage, 
      notes 
    } = req.body

    if (!crop_name || !planting_date || !area_planted) {
      return res.status(400).json({ message: "Crop name, planting date, and area planted are required" })
    }

    const result = await queryWithRetry(
      `INSERT INTO plantings 
       (crop_name, variety, planting_date, expected_harvest_date, area_planted, location, growth_stage, notes, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) 
       RETURNING *`,
      [crop_name, variety, planting_date, expected_harvest_date, area_planted, location, growth_stage || 'planted', notes, 'active']
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Create planting error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.put("/api/plantings/:id", authenticateToken, async (req, res) => {
  try {
    // Check permissions - only Admin and Farm Manager can update plantings
    if (!["Admin", "Farm Manager"].includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to update plantings" })
    }

    const plantingId = req.params.id
    const { 
      crop_name, 
      variety, 
      planting_date, 
      expected_harvest_date, 
      area_planted, 
      location, 
      growth_stage, 
      notes,
      status 
    } = req.body

    if (!crop_name || !planting_date || !area_planted) {
      return res.status(400).json({ message: "Crop name, planting date, and area planted are required" })
    }

    const result = await queryWithRetry(
      `UPDATE plantings 
       SET crop_name = $1, variety = $2, planting_date = $3, expected_harvest_date = $4, 
           area_planted = $5, location = $6, growth_stage = $7, notes = $8, status = $9, updated_at = NOW()
       WHERE id = $10 
       RETURNING *`,
      [crop_name, variety, planting_date, expected_harvest_date, area_planted, location, growth_stage, notes, status || 'active', plantingId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Planting not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Update planting error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.delete("/api/plantings/:id", authenticateToken, async (req, res) => {
  try {
    // Check permissions - only Admin and Farm Manager can delete plantings
    if (!["Admin", "Farm Manager"].includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to delete plantings" })
    }

    const plantingId = req.params.id
    const result = await queryWithRetry(
      "DELETE FROM plantings WHERE id = $1 RETURNING id",
      [plantingId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Planting not found" })
    }

    res.json({ message: "Planting deleted successfully" })
  } catch (error) {
    console.error("Delete planting error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Livestock Health Records API
app.get("/api/livestock-health", authenticateToken, async (req, res) => {
  try {
    const result = await queryWithRetry(
      `SELECT hr.*, l.name as animal_name, l.species 
       FROM health_records hr 
       LEFT JOIN livestock l ON hr.livestock_id = l.id 
       ORDER BY hr.record_date DESC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error("Get health records error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.get("/api/livestock-health/:id", authenticateToken, async (req, res) => {
  try {
    const recordId = req.params.id
    const result = await queryWithRetry(
      `SELECT hr.*, l.name as animal_name, l.species 
       FROM health_records hr 
       LEFT JOIN livestock l ON hr.livestock_id = l.id 
       WHERE hr.id = $1`,
      [recordId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Health record not found" })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error("Get health record error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/api/livestock-health", authenticateToken, async (req, res) => {
  try {
    // Check permissions - only Admin, Farm Manager, and Veterinary Doctor can create health records
    if (!["Admin", "Farm Manager", "Veterinary Doctor"].includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to create health records" })
    }

    const { 
      livestock_id, 
      record_type, 
      record_date, 
      description, 
      treatment, 
      veterinarian, 
      cost, 
      next_due_date, 
      notes 
    } = req.body

    if (!livestock_id || !record_type || !record_date) {
      return res.status(400).json({ message: "Livestock ID, record type, and record date are required" })
    }

    const result = await queryWithRetry(
      `INSERT INTO health_records 
       (livestock_id, record_type, record_date, description, treatment, veterinarian, cost, next_due_date, notes, created_by, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) 
       RETURNING *`,
      [livestock_id, record_type, record_date, description, treatment, veterinarian, cost || 0, next_due_date, notes, req.user.id]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Create health record error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.put("/api/livestock-health/:id", authenticateToken, async (req, res) => {
  try {
    // Check permissions - only Admin, Farm Manager, and Veterinary Doctor can update health records
    if (!["Admin", "Farm Manager", "Veterinary Doctor"].includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to update health records" })
    }

    const recordId = req.params.id
    const { 
      livestock_id, 
      record_type, 
      record_date, 
      description, 
      treatment, 
      veterinarian, 
      cost, 
      next_due_date, 
      notes 
    } = req.body

    if (!livestock_id || !record_type || !record_date) {
      return res.status(400).json({ message: "Livestock ID, record type, and record date are required" })
    }

    const result = await queryWithRetry(
      `UPDATE health_records 
       SET livestock_id = $1, record_type = $2, record_date = $3, description = $4, 
           treatment = $5, veterinarian = $6, cost = $7, next_due_date = $8, notes = $9, updated_at = NOW()
       WHERE id = $10 
       RETURNING *`,
      [livestock_id, record_type, record_date, description, treatment, veterinarian, cost || 0, next_due_date, notes, recordId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Health record not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Update health record error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.delete("/api/livestock-health/:id", authenticateToken, async (req, res) => {
  try {
    // Check permissions - only Admin and Farm Manager can delete health records
    if (!["Admin", "Farm Manager"].includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to delete health records" })
    }

    const recordId = req.params.id
    const result = await queryWithRetry(
      "DELETE FROM health_records WHERE id = $1 RETURNING id",
      [recordId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Health record not found" })
    }

    res.json({ message: "Health record deleted successfully" })
  } catch (error) {
    console.error("Delete health record error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Farm Resources API
app.get("/api/farm-resources", authenticateToken, async (req, res) => {
  try {
    const result = await queryWithRetry(
      `SELECT * FROM farm_resources ORDER BY created_at DESC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error("Get farm resources error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.get("/api/farm-resources/:id", authenticateToken, async (req, res) => {
  try {
    const resourceId = req.params.id
    const result = await queryWithRetry(
      "SELECT * FROM farm_resources WHERE id = $1",
      [resourceId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Resource not found" })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error("Get farm resource error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/api/farm-resources", authenticateToken, async (req, res) => {
  try {
    // Check permissions - only Admin and Farm Manager can create resources
    if (!["Admin", "Farm Manager"].includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to create resources" })
    }

    const { 
      name, 
      category, 
      current_stock, 
      unit, 
      min_threshold, 
      max_capacity, 
      cost_per_unit, 
      supplier, 
      expiry_date 
    } = req.body

    if (!name || !category || current_stock === undefined || !unit) {
      return res.status(400).json({ message: "Name, category, current stock, and unit are required" })
    }

    // Determine status based on stock levels
    let status = "in_stock"
    if (current_stock <= 0) {
      status = "out_of_stock"
    } else if (min_threshold && current_stock <= min_threshold) {
      status = "low_stock"
    }

    const result = await queryWithRetry(
      `INSERT INTO farm_resources 
       (name, category, current_stock, unit, min_threshold, max_capacity, cost_per_unit, supplier, expiry_date, status, created_at, last_updated) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) 
       RETURNING *`,
      [name, category, current_stock, unit, min_threshold || 0, max_capacity || 0, cost_per_unit || 0, supplier, expiry_date, status]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Create farm resource error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.put("/api/farm-resources/:id", authenticateToken, async (req, res) => {
  try {
    // Check permissions - only Admin and Farm Manager can update resources
    if (!["Admin", "Farm Manager"].includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to update resources" })
    }

    const resourceId = req.params.id
    const { 
      name, 
      category, 
      current_stock, 
      unit, 
      min_threshold, 
      max_capacity, 
      cost_per_unit, 
      supplier, 
      expiry_date 
    } = req.body

    if (!name || !category || current_stock === undefined || !unit) {
      return res.status(400).json({ message: "Name, category, current stock, and unit are required" })
    }

    // Determine status based on stock levels
    let status = "in_stock"
    if (current_stock <= 0) {
      status = "out_of_stock"
    } else if (min_threshold && current_stock <= min_threshold) {
      status = "low_stock"
    }

    const result = await queryWithRetry(
      `UPDATE farm_resources 
       SET name = $1, category = $2, current_stock = $3, unit = $4, min_threshold = $5, 
           max_capacity = $6, cost_per_unit = $7, supplier = $8, expiry_date = $9, status = $10, last_updated = NOW()
       WHERE id = $11 
       RETURNING *`,
      [name, category, current_stock, unit, min_threshold || 0, max_capacity || 0, cost_per_unit || 0, supplier, expiry_date, status, resourceId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Resource not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Update farm resource error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.delete("/api/farm-resources/:id", authenticateToken, async (req, res) => {
  try {
    // Check permissions - only Admin and Farm Manager can delete resources
    if (!["Admin", "Farm Manager"].includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to delete resources" })
    }

    const resourceId = req.params.id
    const result = await queryWithRetry(
      "DELETE FROM farm_resources WHERE id = $1 RETURNING id",
      [resourceId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Resource not found" })
    }

    res.json({ message: "Resource deleted successfully" })
  } catch (error) {
    console.error("Delete farm resource error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})