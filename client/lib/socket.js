import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

let socketInstance = null;
let socketToken = null;

export function getSocket() {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("agrovista_token");

  if (socketInstance && socketToken !== token) {
    socketInstance.disconnect();
    socketInstance = null;
    socketToken = null;
  }

  if (!socketInstance) {
    console.log(`[Socket] Connecting to ${SOCKET_URL}`);

    socketInstance = io(SOCKET_URL, {
      autoConnect: true,
      timeout: 15000,
      reconnectionAttempts: 10,
      auth: { token }
    });
    socketToken = token;

    socketInstance.on("connect_error", (error) => {
      console.warn("[Socket] Connection error.", error.message);
    });

    socketInstance.on("disconnect", () => {
      socketToken = localStorage.getItem("agrovista_token");
    });
  }

  return socketInstance;
}
