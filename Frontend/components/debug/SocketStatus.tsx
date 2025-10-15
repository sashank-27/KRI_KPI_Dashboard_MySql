"use client";

import { useSocket } from "@/hooks/useSocket";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiBaseUrl } from "@/lib/api";

export function SocketStatus() {
  const { socket, isConnected } = useSocket();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">WebSocket Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Connection:</span>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Socket ID:</span>
          <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
            {socket?.id || "N/A"}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Server URL:</span>
          <span className="text-xs font-mono bg-muted px-2 py-1 rounded truncate max-w-[150px]">
            {getApiBaseUrl()}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Transport:</span>
          <span className="text-xs bg-muted px-2 py-1 rounded">
            {socket?.io.engine.transport?.name || "N/A"}
          </span>
        </div>
        
        {socket && (
          <div className="pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              Last ping: {new Date().toLocaleTimeString()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SocketDebugPanel() {
  const { socket, isConnected } = useSocket();

  const testConnection = () => {
    if (socket) {
      console.log("🧪 Testing socket connection...");
      socket.emit('ping', { timestamp: Date.now() });
    }
  };

  const joinAdminRoom = () => {
    if (socket) {
      console.log("🏠 Joining admin room...");
      socket.emit('join-admin-room');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">WebSocket Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SocketStatus />
        
        <div className="space-y-2">
          <button
            onClick={testConnection}
            disabled={!isConnected}
            className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            Test Connection
          </button>
          
          <button
            onClick={joinAdminRoom}
            disabled={!isConnected}
            className="w-full px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
          >
            Join Admin Room
          </button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>Open browser console to see WebSocket logs.</p>
        </div>
      </CardContent>
    </Card>
  );
}