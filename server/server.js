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

// Auth routes
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }
    
    const result = await queryWithRetry("SELECT * FROM users WHERE email = $1", [email])
    const user = result.rows[0]
    
    if (!user) {
      return res.status(401).json({ message: "User does not exist" })
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(401).json({ message: "Please verify your email before logging in" })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" },
    )

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/api/auth/register", async (req, res) => {
  try {
    const { full_name, email, phone, password, role } = req.body

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: "Full name, email and password are required" })
    }

    // Check if user exists
    const existingUser = await queryWithRetry("SELECT * FROM users WHERE email = $1", [email])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" })
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10)

    const result = await queryWithRetry(
      "INSERT INTO users (full_name, email, phone, password_hash, role, email_verified) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, full_name, email, role",
      [full_name, email, phone || null, password_hash, role || 'Staff', false],
    )

    const user = result.rows[0]
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" },
    )

    res.status(201).json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Email verification endpoint
app.post("/api/auth/send-verification", async (req, res) => {
  try {
    const { email } = req.body
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" })
    }
    
    // Check if user exists
    const userResult = await queryWithRetry("SELECT * FROM users WHERE email = $1", [email])
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }
    
    const user = userResult.rows[0]
    
    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ message: "Email is already verified" })
    }
    
    // Generate verification token
    const crypto = require('crypto')
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    // Store token in database
    await queryWithRetry(
      "INSERT INTO verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3",
      [user.id, verificationToken, tokenExpiry]
    )
    
    // Send verification email (using nodemailer or similar)
    // For now, we'll simulate email sending
    console.log(`Verification email sent to ${email} with token: ${verificationToken}`)
    
    res.json({ message: "Verification email sent successfully" })
  } catch (error) {
    console.error("Send verification error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Verify email endpoint
app.post("/api/auth/verify-email", async (req, res) => {
  try {
    const { token } = req.body
    
    if (!token) {
      return res.status(400).json({ message: "Verification token is required" })
    }
    
    // Find and validate token
    const tokenResult = await queryWithRetry(
      "SELECT vt.*, u.email FROM verification_tokens vt JOIN users u ON vt.user_id = u.id WHERE vt.token = $1 AND vt.expires_at > NOW()",
      [token]
    )
    
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired verification token" })
    }
    
    const tokenData = tokenResult.rows[0]
    
    // Mark user as verified
    await queryWithRetry(
      "UPDATE users SET email_verified = true WHERE id = $1",
      [tokenData.user_id]
    )
    
    // Delete the used token
    await queryWithRetry(
      "DELETE FROM verification_tokens WHERE user_id = $1",
      [tokenData.user_id]
    )
    
    res.json({ message: "Email verified successfully" })
  } catch (error) {
    console.error("Email verification error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Forgot password endpoint
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" })
    }
    
    // Check if user exists
    const userResult = await queryWithRetry("SELECT * FROM users WHERE email = $1", [email])
    if (userResult.rows.length === 0) {
      // Don't reveal if user exists for security
      return res.json({ message: "If an account with this email exists, a password reset link has been sent." })
    }
    
    // Generate reset token
    const crypto = require('crypto')
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now
    
    // Store token in database (you may want to create a password_reset_tokens table)
    // For now, we'll just simulate success
    console.log(`Password reset email would be sent to ${email} with token: ${resetToken}`)
    
    res.json({ message: "If an account with this email exists, a password reset link has been sent." })
  } catch (error) {
    console.error("Forgot password error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Reset password endpoint
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" })
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" })
    }
    
    // Here you would verify the token and update the user's password
    // For demo purposes, we'll just simulate success
    console.log(`Password reset attempted with token: ${token}`)
    
    // Hash the new password
    const password_hash = await bcrypt.hash(newPassword, 10)
    
    // In a real implementation, you would:
    // 1. Verify the token exists and hasn't expired
    // 2. Update the user's password
    // 3. Delete the reset token
    
    res.json({ message: "Password reset successfully" })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

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

    if (!title || !due_date || !tag) {
      return res.status(400).json({ message: "Title, due date, and tag are required" })
    }

    let finalRecurrent = tag === "static" ? true : false
    let finalActiveDate = tag === "dynamic" ? (active_date || due_date) : null

    const result = await pool.query(
      `INSERT INTO tasks 
       (title, description, due_date, due_time, assigned_to, priority, created_by, status, tag, recurrent, active_date) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        title,
        description,
        due_date,
        due_time || null,
        assigned_to,
        priority || 'Medium',
        created_by,
        'pending',
        tag,
        finalRecurrent,
        finalActiveDate
      ]
    )

    res.status(201).json({ message: 'Task created successfully', task: result.rows[0] })
  } catch (error) {
    console.error("Create task error:", error)
    res.status(500).json({ message: "Server error" })
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

    if (!title || !event_date) {
      return res.status(400).json({ message: "Title and event date are required" })
    }

    const result = await pool.query(
      "INSERT INTO events (title, description, event_date, event_time, location, type, priority, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [title, description, event_date, event_time || null, location || null, type || "Task", priority || "Medium", created_by],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Create event error:", error)
    res.status(500).json({ message: "Server error" })
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

    // Mock metrics - replace with real sources as needed
    const activeLivestock = 373
    const staffEfficiency = 91.2
    const monthlyRevenue = 22.8

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
    const { full_name, email, phone, password, role } = req.body

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: "Full name, email and password are required" })
    }

    // Check if user exists
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" })
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10)

    const result = await pool.query(
      "INSERT INTO users (full_name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role, phone",
      [full_name, email, phone || null, password_hash, role || 'Staff'],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Create user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.put("/api/users/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id
    const { full_name, email, phone, role } = req.body

    if (!full_name || !email) {
      return res.status(400).json({ message: "Full name and email are required" })
    }

    const result = await pool.query(
      "UPDATE users SET full_name = $1, email = $2, phone = $3, role = $4 WHERE id = $5 RETURNING id, full_name, email, role, phone",
      [full_name, email, phone || null, role, userId],
    )

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

// Livestock Management Endpoints
app.get("/api/livestock", authenticateToken, async (req, res) => {
  try {
    const result = await queryWithRetry(
      "SELECT * FROM livestock ORDER BY created_at DESC"
    )
    res.json({ data: result.rows })
  } catch (error) {
    console.error("Get livestock error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/api/livestock", authenticateToken, async (req, res) => {
  try {
    const { name, type, breed, age, weight, health_status, location, notes } = req.body
    const created_by = req.user.id
    
    // Check if user has permission to create livestock
    if (!['Admin', 'Farm Manager'].includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions to create livestock" })
    }
    
    if (!name || !type) {
      return res.status(400).json({ message: "Name and type are required" })
    }
    
    const result = await queryWithRetry(
      `INSERT INTO livestock (name, type, breed, age, weight, health_status, location, notes, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, type, breed, age, weight, health_status || 'Healthy', location, notes, created_by]
    )
    
    res.status(201).json({ message: 'Livestock created successfully', livestock: result.rows[0] })
  } catch (error) {
    console.error("Create livestock error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.put("/api/livestock/:id", authenticateToken, async (req, res) => {
  try {
    const { name, type, breed, age, weight, health_status, location, notes } = req.body
    const livestockId = req.params.id
    
    // Check if user has permission to update livestock
    if (!['Admin', 'Farm Manager', 'Veterinary Doctor'].includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions to update livestock" })
    }
    
    const result = await queryWithRetry(
      `UPDATE livestock 
       SET name = $1, type = $2, breed = $3, age = $4, weight = $5, health_status = $6, location = $7, notes = $8, updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [name, type, breed, age, weight, health_status, location, notes, livestockId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Livestock not found" })
    }
    
    res.json({ message: 'Livestock updated successfully', livestock: result.rows[0] })
  } catch (error) {
    console.error("Update livestock error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.delete("/api/livestock/:id", authenticateToken, async (req, res) => {
  try {
    const livestockId = req.params.id
    
    // Check if user has permission to delete livestock
    if (!['Admin', 'Farm Manager'].includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions to delete livestock" })
    }
    
    const result = await queryWithRetry(
      "DELETE FROM livestock WHERE id = $1 RETURNING id",
      [livestockId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Livestock not found" })
    }
    
    res.json({ message: 'Livestock deleted successfully' })
  } catch (error) {
    console.error("Delete livestock error:", error)
    res.status(500).json({ message: "Server error" })
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

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})