"use client";

import { getApiBaseUrl } from "@/lib/api";
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Global socket instance to prevent multiple connections
let globalSocket: Socket | null = null;

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const isInitializing = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Only run on client side after component is mounted
    if (!isMounted) return;

    // If socket already exists, use it
    if (globalSocket) {
      setSocket(globalSocket);
      setIsConnected(globalSocket.connected);
      return;
    }

    // Prevent multiple initialization attempts
    if (isInitializing.current) {
      return;
    }
    isInitializing.current = true;

    const newSocket = io(getApiBaseUrl(), {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      autoConnect: true,
      upgrade: true,
      rememberUpgrade: true
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.IO: Connection error:', error.message);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      setIsConnected(true);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('🔄💥 Socket.IO: Reconnection error:', error.message);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('🔄❌ Socket.IO: Failed to reconnect after maximum attempts');
    });

    // Store global reference
    globalSocket = newSocket;
    setSocket(newSocket);
    isInitializing.current = false;

    return () => {
      // Don't close the socket on component unmount, keep it global
    };
  }, [isMounted]);

  return { socket, isConnected };
};

export const useSocketEvent = (socket: Socket | null, event: string, callback: (data: any) => void) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handler = (data: any) => {
      callbackRef.current(data);
    };

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, event]);
};
