// const { SimpleNotifications, startNotifications } = require('./notifications');

// async function testNotifications() {
//     try {
//         // Test getAllUsers
//         const users = await SimpleNotifications.getAllUsers();
//         console.log('Users:', users);

//         // Test getTodayTasks
//         const tasks = await SimpleNotifications.getTodayTasks(2);
//         console.log('Today’s tasks:', tasks);

//         const sendTaskNotification = await SimpleNotifications.sendMorningSummary(users, tasks);
//         console.log('Task notification sent:', sendTaskNotification);

//         // Test sending a test notification
//         // const routes = require('./notifications').getNotificationRoutes();
//         // await routes.testNotification(2);
//         console.log('Test notification sent');
//     } catch (error) {
//         console.error('Notification test failed:', error);
//     }
// }

// testNotifications();
// startNotifications(); // Start cron jobs

const { sendPushToUser } = require('./push')

const userId = 2

sendPushToUser(userId, {
  title: "Test Notification",
  body: "This is a test push notification.",
  icon: "../public/android-chrome-192x192.png"
}).then(() => {
  console.log("Test notification sent!")
  process.exit()
}).catch(err => {
  console.error("Error sending test notification:", err)
  process.exit(1)
})