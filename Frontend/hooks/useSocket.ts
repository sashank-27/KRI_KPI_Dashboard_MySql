"use client";

import { getApiBaseUrl } from "@/lib/api";
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Global socket instance to prevent multiple connections
let globalSocket: Socket | null = null;
let connectionCount = 0;

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Only run on client side after component is mounted
    if (!isMounted) return;

    // If socket already exists and is connected, reuse it
    if (globalSocket?.connected) {
      console.log('✅ Reusing existing socket connection');
      setSocket(globalSocket);
      setIsConnected(true);
      connectionCount++;
      
      return () => {
        connectionCount--;
      };
    }

    // If socket exists but disconnected, try to reconnect
    if (globalSocket && !globalSocket.connected) {
      console.log('🔄 Reconnecting existing socket');
      globalSocket.connect();
      setSocket(globalSocket);
      setIsConnected(globalSocket.connected);
      connectionCount++;
      
      return () => {
        connectionCount--;
      };
    }

    // Create new socket connection
    console.log('🚀 Creating new socket connection to:', getApiBaseUrl());
    
    const socketOptions = {
      withCredentials: true,
      transports: ['polling', 'websocket'], // Try polling first, then upgrade to websocket
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      autoConnect: true,
      upgrade: true,
      rememberUpgrade: true,
      path: '/socket.io/', // Explicit path
    };
    
    const newSocket = io(getApiBaseUrl(), socketOptions);

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      if (mountedRef.current) {
        setIsConnected(true);
      }
      
      // Join admin room automatically for all connections
      newSocket.emit('join-admin-room');
      
      // Join user room if user is logged in
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.id) {
          newSocket.emit('join-user-room', user.id);
          console.log('✅ Joined user room for user:', user.id);
        }
      } catch (error) {
        console.error('❌ Failed to join user room:', error);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      if (mountedRef.current) {
        setIsConnected(false);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.warn('⚠️  Socket connection error:', error.message);
      if (mountedRef.current) {
        setIsConnected(false);
      }
      // Don't throw error, just log and retry
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      if (mountedRef.current) {
        setIsConnected(true);
      }
      
      // Rejoin rooms after reconnection
      newSocket.emit('join-admin-room');
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.id) {
          newSocket.emit('join-user-room', user.id);
        }
      } catch (error) {
        console.error('❌ Failed to rejoin rooms:', error);
      }
    });

    newSocket.on('reconnect_error', (error) => {
      console.warn('⚠️  Socket reconnection error:', error.message);
      // Continue retrying, don't give up
    });

    newSocket.on('reconnect_failed', () => {
      console.warn('⚠️  Socket failed to reconnect, will keep trying...');
      // Since we set reconnectionAttempts to Infinity, this shouldn't happen
    });

    newSocket.on('admin-room-joined', () => {
      console.log('✅ Admin room joined successfully');
    });

    // Store global reference
    globalSocket = newSocket;
    setSocket(newSocket);
    connectionCount++;

    return () => {
      connectionCount--;
      // Only disconnect when no components are using the socket
      if (connectionCount <= 0 && globalSocket) {
        console.log('🔌 Disconnecting socket (no more users)');
        globalSocket.disconnect();
        globalSocket = null;
        connectionCount = 0;
      }
    };
  }, [isMounted]);

  return { socket, isConnected };
};

export const useSocketEvent = (socket: Socket | null, event: string, callback: (data: any) => void) => {
  const callbackRef = useRef(callback);
  
  // Always update the callback ref to the latest version
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!socket || !socket.connected) {
      return;
    }

    const handler = (data: any) => {
      console.log(`📨 Socket event received: ${event}`, data);
      callbackRef.current(data);
    };

    socket.on(event, handler);
    console.log(`👂 Listening to socket event: ${event}`);

    return () => {
      socket.off(event, handler);
      console.log(`👋 Stopped listening to socket event: ${event}`);
    };
  }, [socket, event]);
};
