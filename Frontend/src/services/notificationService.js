import API from "./api";

// Get all notifications for a recipient (student ID or "teacher")
export async function getNotifications(recipient) {
  const response = await API.get(`/notifications/${recipient}`);
  return response.data;
}

// Mark a single notification as read
export async function markAsRead(notificationId) {
  const response = await API.patch(`/notifications/${notificationId}/read`);
  return response.data;
}

// Mark all notifications as read
export async function markAllRead(recipient) {
  const response = await API.patch(`/notifications/${recipient}/read-all`);
  return response.data;
}

// Delete a notification
export async function deleteNotification(notificationId) {
  const response = await API.delete(`/notifications/${notificationId}`);
  return response.data;
}