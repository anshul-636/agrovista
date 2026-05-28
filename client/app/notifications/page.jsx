"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle, Trash2, ArrowLeft, Landmark, ShoppingBag, Clock } from "lucide-react";
import Header from "../../components/shared/Header";
import Sidebar from "../../components/shared/Sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { useNotificationStore } from "../../store/notificationStore";
import { useAuthStore } from "../../store/authStore";

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { notifications, markAllAsRead, markAsRead, clearNotifications } = useNotificationStore();

  // Route security
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const getNotifIcon = (type) => {
    if (type === "RESTOCK") return <ShoppingBag className="w-5 h-5 text-agri-green" />;
    if (type === "AUCTION") return <Landmark className="w-5 h-5 text-agri-wheat-dark" />;
    return <Clock className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col text-current transition-colors">
      <Header />

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
                Alerts & Updates
              </h1>
              <p className="text-xs sm:text-sm text-agri-brown mt-1">
                Real-time updates regarding bids, restocks, and shipments.
              </p>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={markAllAsRead}
                className="flex items-center gap-1 py-2 px-4 rounded-xl text-xs font-bold"
                disabled={notifications.length === 0}
              >
                <CheckCircle className="w-4 h-4" />
                <span>Mark All Read</span>
              </Button>
              <button
                onClick={clearNotifications}
                className="p-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition"
                title="Clear All Notifications"
                disabled={notifications.length === 0}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notifications Log */}
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="text-center py-20 bg-white/40 dark:bg-black/10 rounded-3xl border border-agri-green/5">
                <Bell className="w-12 h-12 text-agri-brown mx-auto mb-4" />
                <h3 className="text-lg font-bold text-agri-green-dark">Inbox Cleared</h3>
                <p className="text-xs text-agri-brown mt-1.5">You have no unread trade notifications.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <Card
                  key={notif.id}
                  className={`border-agri-green/5 transition hover:border-agri-green/20 ${
                    !notif.isRead ? "bg-agri-green/5 dark:bg-white/5" : ""
                  }`}
                >
                  <CardContent className="p-5 flex items-start gap-4 justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-agri-green/5 shrink-0">
                        {getNotifIcon(notif.type)}
                      </div>
                      <div className="space-y-1">
                        <h4 className={`text-sm font-extrabold ${!notif.isRead ? "text-agri-green-dark dark:text-agri-green-light font-black" : ""}`}>
                          {notif.title}
                        </h4>
                        <p className="text-xs text-agri-brown dark:text-gray-300">{notif.body}</p>
                        <span className="text-[9px] text-agri-brown-light font-semibold block mt-1">
                          {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {!notif.isRead && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="text-[10px] font-black uppercase text-agri-green hover:underline"
                        >
                          Mark Read
                        </button>
                      )}
                      {notif.link && notif.link !== "#" && (
                        <Button
                          variant="ghost"
                          onClick={() => router.push(notif.link)}
                          className="text-[10px] font-bold py-1.5 px-3 border border-agri-green/20 text-agri-green"
                        >
                          Inspect
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
