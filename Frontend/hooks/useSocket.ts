"use client";

import { getApiBaseUrl } from "@/lib/api";
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(getApiBaseUrl(), {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      autoConnect: true,
      upgrade: true,
      rememberUpgrade: false
    });

    newSocket.on('connect', () => {
      console.log('Socket.IO: Connected to server', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket.IO: Disconnected from server', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.IO: Connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket.IO: Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    setSocket(newSocket);

    return () => {
      console.log('Socket.IO: Cleaning up connection');
      newSocket.close();
    };
  }, []);

  return { socket, isConnected };
};

export const useSocketEvent = (socket: Socket | null, event: string, callback: (data: any) => void) => {
  useEffect(() => {
    if (!socket) {
      console.log(`Socket not available for event: ${event}`);
      return;
    }

    console.log(`Setting up listener for event: ${event}`);
    socket.on(event, callback);

    return () => {
      console.log(`Removing listener for event: ${event}`);
      socket.off(event, callback);
    };
  }, [socket, event, callback]);
};
