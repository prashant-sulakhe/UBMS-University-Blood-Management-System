import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Connect to the backend Socket.IO server (same origin in production, proxied in dev)
    const socketUrl = import.meta.env.VITE_SOCKET_URL || '/';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('🔌 Socket.IO connected:', newSocket.id);
      setConnected(true);

      // Join user-specific or admin room
      if (user) {
        if (user.role === 'admin') {
          newSocket.emit('join_admin');
        } else {
          newSocket.emit('join_user', user.id);
        }
      }
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket.IO disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('Socket.IO connection error:', err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
