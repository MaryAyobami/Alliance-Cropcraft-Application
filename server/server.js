const express = require("express")
const cors = require("cors")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { Pool } = require("pg")
require("dotenv").config()
const { startNotifications, getNotificationRoutes } = require('./notifications');
const { AlignHorizontalDistributeCenterIcon } = require("lucide-react")

const app = express()
const port = process.env.PORT || 5000

// Database connection
const pool = new Pool({
  connectionString: "postgresql://postgres.nobbtyhwmjgfeiwpcduk:bams060704@aws-0-eu-north-1.pooler.supabase.com:5432/postgres",
  
  ssl: {
    rejectUnauthorized: false,
  },
})

// Middleware
app.use(cors())
app.use(express.json())

// Start the notification system
startNotifications();

// Add notification endpoints to your existing routes
// const notificationRoutes = getNotificationRoutes();

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

// Auth routes
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email])
    const user = result.rows[0]
    if (!user) {
      return res.status(401).json({ message: "User does not exist" })
    }
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid email or password" })
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

    // Check if user exists
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" })
    }

    // Hash password (simplified for demo)
    const password_hash = await bcrypt.hash(password, 10)

    const result = await pool.query(
      "INSERT INTO users (full_name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role",
      [full_name, email, phone, password_hash, role],
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

// Dashboard routes
app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role
    console.log("User ID:", userId, "Role:", userRole)
    // Get tasks based on user role
    let tasksQuery
    let tasksParams

    if (userRole === "Admin User") {
      tasksQuery = "SELECT * FROM tasks WHERE due_date = CURRENT_DATE"
      tasksParams = []
    } else {
      tasksQuery = "SELECT * FROM tasks WHERE assigned_to = $1 AND due_date = CURRENT_DATE"
      tasksParams = [userId]
    }

    const tasksResult = await pool.query(tasksQuery, tasksParams)
    const tasks = tasksResult.rows
    console.log(tasks)
    const completedTasks = tasks.filter((task) => task.status === "completed").length
    const totalTasks = tasks.length
    const pendingTasks = totalTasks - completedTasks

    // Get active staff count (for admin)
    const staffResult = await pool.query("SELECT COUNT(*) as count FROM users WHERE role != $1", ["Admin User"])
    const activeStaff = Number.parseInt(staffResult.rows[0].count)

    // Get completion rate
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    res.json({
      completionRate,
      activeStaff,
      thisWeekTasks: totalTasks,
      pendingTasks,
      completedTasks: `${completedTasks}/${totalTasks}`,
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
        ORDER BY t.due_time ASC
      `
      params = []
    } else {
      query = `
        SELECT t.*, u.full_name as assigned_name 
        FROM tasks t 
        LEFT JOIN users u ON t.assigned_to = u.id 
        WHERE t.assigned_to = $1 AND t.due_date = CURRENT_DATE 
        ORDER BY t.due_time ASC
      `
      params = [userId]
    }

    const result = await pool.query(query, params)

    // Group tasks by time of day
    const morningTasks = result.rows.filter((task) => {
      const hour = Number.parseInt(task.due_time?.split(":")[0] || "12")
      return hour >= 6 && hour < 12
    })

    const afternoonTasks = result.rows.filter((task) => {
      const hour = Number.parseInt(task.due_time?.split(":")[0] || "12")
      return hour >= 12 && hour < 18
    })

    const eveningTasks = result.rows.filter((task) => {
      const hour = Number.parseInt(task.due_time?.split(":")[0] || "18")
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
app.post("/api/tasks", authenticateToken, async (req, res) => {
  try {
    const { title, description, due_date, due_time, assigned_to, priority } = req.body
    const created_by = req.user.id

    const result = await pool.query(
      "INSERT INTO tasks (title, description, due_date, due_time, assigned_to, priority, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [title, description, due_date, due_time, assigned_to, priority, created_by],
    )

    res.status(201).json({ message: 'Task created successfully', task: result.rows[0] })
  } catch (error) {
    console.error("Tasks error:", error)
    res.status(500).json({ message: "Server error" })
  }
  })
app.get("/api/tasks", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role

    let query
    let params

    if (userRole === "Admin") {
      query = `
        SELECT t.*, u.full_name as assigned_name 
        FROM tasks t 
        LEFT JOIN users u ON t.assigned_to = u.id 
        ORDER BY t.created_at DESC
      `
      params = []
    } else {
      query = `
        SELECT t.*, u.full_name as assigned_name 
        FROM tasks t 
        LEFT JOIN users u ON t.assigned_to = u.id 
        WHERE t.assigned_to = $1 
        ORDER BY t.created_at DESC
      `
      params = [userId]
    }

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error("Tasks error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.put("/api/tasks/:id/complete", authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id

    const result = await pool.query(
      "UPDATE tasks SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      ["completed", taskId],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" })
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
    console.error("Events error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/api/events", authenticateToken, async (req, res) => {
  try {
    const { title, description, event_date, event_time, location, type, priority } = req.body
    const created_by = req.user.id

    const result = await pool.query(
      "INSERT INTO events (title, description, event_date, event_time, location, type, priority, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [title, description, event_date, event_time, location, type || "Task", priority, created_by],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Create event error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Reports routes
app.get("/api/reports/stats", authenticateToken, async (req, res) => {
  try {
    // Task completion rate
    const completionResult = await pool.query(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks
      FROM tasks 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    `)

    const { total_tasks, completed_tasks } = completionResult.rows[0]
    const completionRate = total_tasks > 0 ? ((completed_tasks / total_tasks) * 100).toFixed(1) : 0

    // Active livestock (mock data)
    const activeLivestock = 373

    // Staff efficiency (mock data)
    const staffEfficiency = 91.2

    // Monthly revenue (mock data)
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

app.get("/api/reports/staff-performance", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.full_name,
        u.role,
        COUNT(t.id) as tasks_completed,
        ROUND(AVG(CASE WHEN t.status = 'completed' THEN 100 ELSE 0 END), 1) as efficiency
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to AND t.status = 'completed'
      WHERE u.role != 'Admin User'
      GROUP BY u.id, u.full_name, u.role
      ORDER BY tasks_completed DESC
      LIMIT 5
    `)

    res.json(result.rows)
  } catch (error) {
    console.error("Staff performance error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})


// Users routes
app.get("/api/users", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, full_name, email, role FROM users")
    res.json(result.rows)

  } catch (error) {
    console.error("Users error:", error)
    res.status(500).json({ message: "Server error" })
  }
})
app.get("/api/users/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const result = await pool.query("SELECT id, full_name, email, phone, role FROM users WHERE id = $1", [userId])
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

    const result = await pool.query(
      "UPDATE users SET full_name = $1, email = $2, phone = $3 WHERE id = $4 RETURNING id, full_name, email, phone",
      [full_name, email, phone, userId],
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

    // Check if user exists
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" })
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10)

    const result = await pool.query(
      "INSERT INTO users (full_name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role",
      [full_name, email, phone, password_hash, role],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Create user error:", error)
    res.status(500).json({ message: "Server error" })
  }
} )
app.put("/api/users/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id
    const { full_name, email, phone, role } = req.body

    const result = await pool.query(
      "UPDATE users SET full_name = $1, email = $2, phone = $3, role = $4 WHERE id = $5 RETURNING id, full_name, email, role",
      [full_name, email, phone, role, userId],
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

    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [userId])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Delete user error:", error)
    res.status(500).json({ message: "Server error" })
  }
}
)