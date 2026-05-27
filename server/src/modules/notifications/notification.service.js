const Notification = require('../../models/Notification')


const getNotifications = async (userId) => {
    const notifications = await Notification.find({ user: userId })
        .sort({ isRead: 1, createdAt: -1 })  // unread (false=0) first
        .limit(50)

    const unreadCount = notifications.filter(n => !n.isRead).length

    return { notifications, unreadCount }
}


const markOneRead = async (notifId, userId) => {
    const notif = await Notification.findOneAndUpdate(
        { _id: notifId, user: userId },     // scoped to user for security
        { isRead: true },
        { new: true }
    )

    if (!notif) throw require('../../utils/ApiError')(404, 'Notification not found')

    return notif
}


const markAllRead = async (userId) => {
    const result = await Notification.updateMany(
        { user: userId, isRead: false },
        { isRead: true }
    )

    return { markedRead: result.modifiedCount }
}


const createNotification = async ({ userId, type, title, body, link }) => {
    const notif = await Notification.create({ user: userId, type, title, body, link })

    // Also push via Socket.IO if available
    try {
        const { getIO } = require('../../config/socket')
        getIO().to('user:' + userId.toString()).emit('notification:new', notif)
    } catch { }

    return notif
}

module.exports = { getNotifications, markOneRead, markAllRead, createNotification }
