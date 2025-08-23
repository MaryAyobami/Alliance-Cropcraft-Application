const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { Pool } = require("pg")
const { sendPushToUser } = require('./push')


// Database connection
require("dotenv").config()
const pool = new Pool({
  connectionString: "postgresql://postgres.nobbtyhwmjgfeiwpcduk:bams060704@aws-0-eu-north-1.pooler.supabase.com:5432/postgres",
  ssl: {
    rejectUnauthorized: false,
  },
})

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.stack);
  } else {
    console.log('✅ Connected to database successfully');
    release();
  }
});

const emailer = nodemailer.createTransport({
    service: 'gmail', // Use lowercase 'gmail'
    auth: {
        user: 'ogunmolamaryayobami@gmail.com',
        pass: 'fgaemevgrrrnewle'
    },
    // Add this for explicit configuration (optional)
    host: 'smtp.gmail.com',
    port: 465,
    secure: true // Use SSL/TLS for port 465
});

// Simple notification functions
class SimpleNotifications {
    
    // Send morning summary at 7 AM
    static setupDailySummary() {
        cron.schedule('0 7 * * *', async () => {
            console.log('🌅 Running morning summary job...');
            const users = await this.getAllUsers();
            
            for (let user of users) {
                const tasks = await this.getTodayTasks(user.id);
                if (tasks.length > 0) {
                    await this.sendMorningSummary(user, tasks);
                }
            }
        });
    }

    // Send evening review at 8 PM
    static setupEveningReview() {
        cron.schedule('0 20 * * *', async () => {
            console.log('📊 Running evening review job...');
            const users = await this.getAllUsers();
            
            for (let user of users) {
                const summary = await this.getDaySummary(user.id);
                await this.sendEveningReview(user, summary);
            }
        });
    }

    // Check for upcoming tasks every 30 minutes
    static setupTaskReminders() {
        cron.schedule('*/30 * * * *', async () => {
            console.log('⏰ Checking for upcoming tasks...');
            const upcomingTasks = await this.getUpcomingTasks();
            
            for (let task of upcomingTasks) {
                const user = await this.getUserById(task.assigned_to);
                const minutesLeft = this.getMinutesUntilDue(task.due_date);
                
                if (minutesLeft <= 60 && minutesLeft > 30) {
                    await this.sendTaskReminder(user, task, '1 hour');
                } else if (minutesLeft <= 15 && minutesLeft > 0) {
                    await this.sendUrgentReminder(user, task);
                }
            }
        });
    }

    // Check for upcoming events every 15 minutes
    static setupEventReminders() {
        cron.schedule('*/15 * * * *', async () => {
            console.log('📅 Checking for upcoming events...');
            try {
                const result = await pool.query(`
                    SELECT e.*, u.id as user_id, u.email, u.full_name
                    FROM events e
                    JOIN users u ON u.id = e.created_by
                    WHERE e.event_date::timestamp + COALESCE(e.event_time::interval, '00:00') > NOW()
                      AND e.event_date::timestamp + COALESCE(e.event_time::interval, '00:00') <= NOW() + INTERVAL '2 hours'
                `)
                for (const ev of result.rows) {
                    const eventDate = new Date(`${ev.event_date}T${ev.event_time || '00:00'}:00`)
                    const minutesLeft = Math.floor((eventDate - new Date()) / (1000 * 60))
                    const threshold = ev.reminder_minutes ?? 30
                    if (ev.notify && minutesLeft <= threshold && minutesLeft >= threshold - 15) {
                        await sendPushToUser(ev.user_id, {
                            title: 'Event Reminder',
                            body: `${ev.title} starts in ${minutesLeft} minutes`,
                            icon: '/public/android-chrome-192x192.png'
                        })
                    }
                }
            } catch (error) {
                console.error('❌ Error checking events:', error)
            }
        })
    }

    // Check overdue tasks every hour
    static setupOverdueCheck() {
        cron.schedule('0 * * * *', async () => {
            console.log('⚠️ Checking for overdue tasks...');
            const overdueTasks = await this.getOverdueTasks();
            
            for (let task of overdueTasks) {
                const user = await this.getUserById(task.assigned_to);
                await this.sendOverdueAlert(user, task);
            }
        });
    }

    // Morning summary email
    static async sendMorningSummary(user, tasks) {
        try {
            const html = `
                <h2>🌅 Good Morning, ${user.full_name || user.name}!</h2>
                <p>You have <strong>${tasks.length}</strong> tasks today:</p>
                <div style="background: #f0f8f0; padding: 15px; margin: 15px 0;">
                    ${tasks.map(task => `
                        <div style="margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #4CAF50;">
                            <strong>${task.title}</strong><br>
                            Due: ${new Date(task.due_date).toLocaleString()}<br>
                            Priority: ${task.priority || 'Normal'}
                        </div>
                    `).join('')}
                </div>
                <p>Have a productive day!</p>
            `;

            await emailer.sendMail({
                from: 'ogunmolamaryayobami@gmail.com',
                to: user.email,
                subject: `Daily Tasks - ${new Date().toDateString()}`,
                html: html
            });
            
            console.log(`✅ Morning summary sent to ${user.email}`);
        } catch (error) {
            console.error('❌ Error sending morning summary:', error);
        }
    }

    // Evening review email
    static async sendEveningReview(user, summary) {
        try {
            const percentage = Math.round((summary.completed / summary.total) * 100) || 0;
            
            const html = `
                <h2>📊 Daily Review - ${user.full_name || user.name}</h2>
                <div style="text-align: center; margin: 20px 0;">
                    <div style="background: #4CAF50; color: white; padding: 20px; border-radius: 10px; display: inline-block;">
                        <h1 style="margin: 0;">${percentage}%</h1>
                        <p style="margin: 5px 0;">Tasks Completed</p>
                    </div>
                </div>
                <div style="background: #f9f9f9; padding: 15px; margin: 15px 0;">
                    <p>✅ Completed: ${summary.completed}</p>
                    <p>⏳ Pending: ${summary.pending}</p>
                    <p>⚠️ Overdue: ${summary.overdue}</p>
                </div>
                ${percentage >= 80 ? '<p style="color: green;">🎉 Great job today!</p>' : '<p>Keep up the good work tomorrow! 💪</p>'}
            `;

            await emailer.sendMail({
                from: process.env.EMAIL_USER || 'ogunmolamaryayobami@gmail.com',
                to: user.email,
                subject: `Daily Review - ${percentage}% Complete`,
                html: html
            });
            
            console.log(`✅ Evening review sent to ${user.email}`);
        } catch (error) {
            console.error('❌ Error sending evening review:', error);
        }
    }

    // Task reminder email
    static async sendTaskReminder(user, task, timeLeft) {
        try {
            const html = `
                <h2>⏰ Task Reminder</h2>
                <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107;">
                    <h3>${task.title}</h3>
                    <p><strong>Due in: ${timeLeft}</strong></p>
                    <p>Due: ${new Date(task.due_date).toLocaleString()}</p>
                    <p>Priority: ${task.priority || 'Normal'}</p>
                </div>
            `;
            await sendPushToUser(user.id, {
            title: "🌅 Good Morning!",
            body: `You have ${tasks.length} tasks today.`,
            icon: "/public/android-chrome-192x192.png"
        })
                    await emailer.sendMail({
                from: process.env.EMAIL_USER || 'ogunmolamaryayobami@gmail.com',
                to: user.email,
                subject: `Task Due Soon: ${task.title}`,
                html: html
            });
            
            console.log(`✅ Task reminder sent to ${user.email}`);
        } catch (error) {
            console.error('❌ Error sending task reminder:', error);
        }
    }

    // Urgent reminder
    static async sendUrgentReminder(user, task) {
        try {
            const html = `
                <h2 style="color: red;">🚨 URGENT: Task Due Soon!</h2>
                <div style="background: #f8d7da; padding: 15px; border-left: 4px solid #dc3545;">
                    <h3>${task.title}</h3>
                    <p><strong>Due in 15 minutes!</strong></p>
                    <p>Due: ${new Date(task.due_date).toLocaleString()}</p>
                </div>
            `;

            await emailer.sendMail({
                from: process.env.EMAIL_USER || 'ogunmolamaryayobami@gmail.com',
                to: user.email,
                subject: `🚨 URGENT: ${task.title}`,
                html: html
            });
            
            console.log(`🚨 Urgent reminder sent to ${user.email}`);
        } catch (error) {
            console.error('❌ Error sending urgent reminder:', error);
        }
    }

    // Overdue alert
    static async sendOverdueAlert(user, task) {
        try {
            const html = `
                <h2 style="color: red;">⚠️ Overdue Task</h2>
                <div style="background: #f8d7da; padding: 15px; border-left: 4px solid #dc3545;">
                    <h3>${task.title}</h3>
                    <p><strong>This task is overdue!</strong></p>
                    <p>Was due: ${new Date(task.due_date).toLocaleString()}</p>
                </div>
            `;

            await emailer.sendMail({
                from: process.env.EMAIL_USER || 'ogunmolamaryayobami@gmail.com',
                to: user.email,
                subject: `⚠️ Overdue: ${task.title}`,
                html: html
            });
            
            console.log(`⚠️ Overdue alert sent to ${user.email}`);
        } catch (error) {
            console.error('❌ Error sending overdue alert:', error);
        }
    }

    // Send verification email
    static async sendVerificationEmail(user, token) {
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
        
        const mailOptions = {
            from: 'ogunmolamaryayobami@gmail.com',
            to: user.email,
            subject: 'Verify Your Alliance CropCraft Account',
            html: `
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #f9f9f9;">
                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 24px;">Alliance CropCraft</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Farm Management System</p>
                    </div>
                    
                    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <h2 style="color: #374151; margin-bottom: 20px;">Welcome ${user.full_name}!</h2>
                        
                        <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
                            Thank you for registering with Alliance CropCraft. To complete your account setup and start managing your farm operations, please verify your email address.
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationUrl}" 
                               style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                                      color: white; 
                                      padding: 15px 30px; 
                                      text-decoration: none; 
                                      border-radius: 8px; 
                                      font-weight: bold; 
                                      display: inline-block;
                                      box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                                Verify My Email
                            </a>
                        </div>
                        
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p style="color: #6b7280; margin: 0; font-size: 14px;">
                                <strong>Can't click the button?</strong><br>
                                Copy and paste this link into your browser:<br>
                                <span style="word-break: break-all; color: #10b981;">${verificationUrl}</span>
                            </p>
                        </div>
                        
                        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                This verification link will expire in 24 hours for security reasons.<br>
                                If you didn't create this account, please ignore this email.
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 20px;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                Best regards,<br>
                                <strong style="color: #10b981;">The Alliance CropCraft Team</strong>
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        try {
            await emailer.sendMail(mailOptions);
            console.log(`✅ Verification email sent to ${user.email}`);
        } catch (error) {
            console.error(`❌ Failed to send verification email to ${user.email}:`, error);
            throw error;
        }
    }

    // Send task assignment notification
    static async sendTaskAssignment(assignedUser, createdByUser, task) {
        const mailOptions = {
            from: 'ogunmolamaryayobami@gmail.com',
            to: assignedUser.email,
            subject: 'New Task Assigned - Alliance CropCraft',
            html: `
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #f9f9f9;">
                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 24px;">New Task Assigned</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Alliance CropCraft Task Management</p>
                    </div>
                    
                    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <h2 style="color: #374151; margin-bottom: 20px;">Hi ${assignedUser.full_name}!</h2>
                        
                        <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
                            You have been assigned a new task by <strong>${createdByUser.full_name}</strong>. Here are the details:
                        </p>
                        
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin: 0 0 15px 0; color: #10b981; font-size: 18px;">${task.title}</h3>
                            ${task.description ? `<p style="color: #6b7280; margin: 0 0 15px 0;">${task.description}</p>` : ''}
                            
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">
                                <div>
                                    <strong style="color: #374151;">Priority:</strong>
                                    <span style="color: ${task.priority === 'high' ? '#dc2626' : task.priority === 'medium' ? '#d97706' : '#059669'}; text-transform: capitalize;">${task.priority}</span>
                                </div>
                                <div>
                                    <strong style="color: #374151;">Due Date:</strong>
                                    <span style="color: #6b7280;">${task.due_date}</span>
                                </div>
                                ${task.due_time ? `
                                <div>
                                    <strong style="color: #374151;">Due Time:</strong>
                                    <span style="color: #6b7280;">${task.due_time}</span>
                                </div>
                                ` : ''}
                                <div>
                                    <strong style="color: #374151;">Type:</strong>
                                    <span style="color: #6b7280; text-transform: capitalize;">${task.tag}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tasks" 
                               style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                                      color: white; 
                                      padding: 15px 30px; 
                                      text-decoration: none; 
                                      border-radius: 8px; 
                                      font-weight: bold; 
                                      display: inline-block;
                                      box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                                View Task Details
                            </a>
                        </div>
                        
                        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                Please complete this task by the due date. If you have any questions, contact ${createdByUser.full_name} or your supervisor.
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 20px;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                Best regards,<br>
                                <strong style="color: #10b981;">The Alliance CropCraft Team</strong>
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        try {
            await emailer.sendMail(mailOptions);
            console.log(`✅ Task assignment email sent to ${assignedUser.email}`);
        } catch (error) {
            console.error(`❌ Failed to send task assignment email to ${assignedUser.email}:`, error);
            throw error;
        }
    }

    // Send event notification
    static async sendEventNotification(createdByUser, event) {
        // Get all users for event notifications (you might want to limit this to specific roles)
        try {
            const usersResult = await pool.query("SELECT * FROM users WHERE notif_email = true OR notif_email IS NULL");
            const users = usersResult.rows;

            for (const user of users) {
                const mailOptions = {
                    from: 'ogunmolamaryayobami@gmail.com',
                    to: user.email,
                    subject: 'New Event Created - Alliance CropCraft',
                    html: `
                        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #f9f9f9;">
                            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
                                <h1 style="margin: 0; font-size: 24px;">New Event Created</h1>
                                <p style="margin: 10px 0 0 0; opacity: 0.9;">Alliance CropCraft Event Management</p>
                            </div>
                            
                            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                <h2 style="color: #374151; margin-bottom: 20px;">Hi ${user.full_name}!</h2>
                                
                                <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
                                    A new event has been created by <strong>${createdByUser.full_name}</strong>. Here are the details:
                                </p>
                                
                                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                    <h3 style="margin: 0 0 15px 0; color: #3b82f6; font-size: 18px;">${event.title}</h3>
                                    ${event.description ? `<p style="color: #6b7280; margin: 0 0 15px 0;">${event.description}</p>` : ''}
                                    
                                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">
                                        <div>
                                            <strong style="color: #374151;">Date:</strong>
                                            <span style="color: #6b7280;">${event.event_date}</span>
                                        </div>
                                        ${event.event_time ? `
                                        <div>
                                            <strong style="color: #374151;">Time:</strong>
                                            <span style="color: #6b7280;">${event.event_time}</span>
                                        </div>
                                        ` : ''}
                                        ${event.location ? `
                                        <div>
                                            <strong style="color: #374151;">Location:</strong>
                                            <span style="color: #6b7280;">${event.location}</span>
                                        </div>
                                        ` : ''}
                                        <div>
                                            <strong style="color: #374151;">Type:</strong>
                                            <span style="color: #6b7280;">${event.type}</span>
                                        </div>
                                        <div>
                                            <strong style="color: #374151;">Priority:</strong>
                                            <span style="color: ${event.priority === 'high' ? '#dc2626' : event.priority === 'medium' ? '#d97706' : '#059669'}; text-transform: capitalize;">${event.priority}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/calendar" 
                                       style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                                              color: white; 
                                              padding: 15px 30px; 
                                              text-decoration: none; 
                                              border-radius: 8px; 
                                              font-weight: bold; 
                                              display: inline-block;
                                              box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                                        View Calendar
                                    </a>
                                </div>
                                
                                <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                        Mark your calendar and make sure to attend this event. If you have any questions, contact the event organizer.
                                    </p>
                                </div>
                                
                                <div style="text-align: center; margin-top: 20px;">
                                    <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                        Best regards,<br>
                                        <strong style="color: #3b82f6;">The Alliance CropCraft Team</strong>
                                    </p>
                                </div>
                            </div>
                        </div>
                    `
                };

                try {
                    await emailer.sendMail(mailOptions);
                    console.log(`✅ Event notification email sent to ${user.email}`);
                } catch (error) {
                    console.error(`❌ Failed to send event notification email to ${user.email}:`, error);
                    // Continue with other users even if one fails
                }
            }
        } catch (error) {
            console.error('❌ Failed to send event notifications:', error);
            throw error;
        }
    }

    // REAL DATABASE FUNCTIONS
    static async getAllUsers() {
        try {
            const result = await pool.query('SELECT * FROM users WHERE email IS NOT NULL');
            return result.rows;
        } catch (error) {
            console.error('❌ Error getting all users:', error);
            return [];
        }
    }

    static async getTodayTasks(userId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const result = await pool.query(`
                SELECT * FROM tasks 
                WHERE assigned_to = $1 
                AND DATE(due_date) = $2 
                AND status != 'completed'
                ORDER BY priority DESC, due_date ASC
            `, [userId, today]);
            return result.rows;
        } catch (error) {
            console.error('❌ Error getting today tasks:', error);
            return [];
        }
    }

    static async getUpcomingTasks() {
        try {
            const result = await pool.query(`
                SELECT * FROM tasks 
                WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '2 hours'
                AND status != 'completed'
                ORDER BY due_date ASC
            `);
            return result.rows;
        } catch (error) {
            console.error('❌ Error getting upcoming tasks:', error);
            return [];
        }
    }

    static async getOverdueTasks() {
        try {
            const result = await pool.query(`
                SELECT * FROM tasks 
                WHERE due_date < NOW() 
                AND status != 'completed'
                ORDER BY due_date ASC
            `);
            return result.rows;
        } catch (error) {
            console.error('❌ Error getting overdue tasks:', error);
            return [];
        }
    }

    static async getUserById(userId) {
        try {
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('❌ Error getting user by ID:', error);
            return null;
        }
    }

    static async getDaySummary(userId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const result = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status != 'completed' AND due_date >= NOW() THEN 1 END) as pending,
                    COUNT(CASE WHEN status != 'completed' AND due_date < NOW() THEN 1 END) as overdue
                FROM tasks 
                WHERE assigned_to = $1 AND DATE(created_at) = $2
            `, [userId, today]);
            
            const summary = result.rows[0];
            return {
                total: parseInt(summary.total) || 0,
                completed: parseInt(summary.completed) || 0,
                pending: parseInt(summary.pending) || 0,
                overdue: parseInt(summary.overdue) || 0
            };
        } catch (error) {
            console.error('❌ Error getting day summary:', error);
            return { total: 0, completed: 0, pending: 0, overdue: 0 };
        }
    }

    static getMinutesUntilDue(dueDate) {
        return Math.floor((new Date(dueDate) - new Date()) / (1000 * 60));
    }
}

// Simple setup function - call this once when your app starts
function startNotifications() {
    console.log('🔔 Starting notification system...');
    
    SimpleNotifications.setupDailySummary();    // 7 AM daily summary
    SimpleNotifications.setupEveningReview();   // 8 PM daily review  
    SimpleNotifications.setupTaskReminders();   // Every 30 min check
    SimpleNotifications.setupEventReminders();  // Every 15 min check for events
    SimpleNotifications.setupOverdueCheck();    // Every hour check
    
    console.log('✅ Notification system active!');
    console.log('📅 Daily Summary: 7:00 AM');
    console.log('📊 Evening Review: 8:00 PM');
    console.log('⏰ Task Reminders: Every 30 minutes');
    console.log('📆 Event Reminders: Every 15 minutes');
    console.log('⚠️ Overdue Check: Every hour');
}

// Optional: Routes you can add to your existing server
function getNotificationRoutes() {
    return {
        // Test notification
        testNotification: async (userId) => {
            const user = await SimpleNotifications.getUserById(userId);
            if (!user) throw new Error('User not found');
            
            await emailer.sendMail({
                from: process.env.EMAIL_USER || 'ogunmolamaryayobami@gmail.com',
                to: user.email,
                subject: 'Test Notification',
                html: '<h2>🧪 Test Email</h2><p>Your notifications are working!</p>'
            });
            
            return { success: true, message: 'Test email sent!' };
        },

        // Send immediate task reminder
        remindTask: async (taskId) => {
            const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
            const task = result.rows[0];
            if (!task) throw new Error('Task not found');
            
            const user = await SimpleNotifications.getUserById(task.assigned_to);
            if (!user) throw new Error('User not found');
            
            await SimpleNotifications.sendTaskReminder(user, task, 'now');
            return { success: true, message: 'Reminder sent!' };
        },

        // Get status
        getStatus: () => ({
            status: 'active',
            features: [
                'Daily Summary (7 AM)',
                'Evening Review (8 PM)', 
                'Task Reminders (Every 30 min)',
                'Overdue Alerts (Every hour)'
            ]
        })
    };
}

// Export everything
module.exports = {
    SimpleNotifications,
    startNotifications,
    getNotificationRoutes,
    pool
};