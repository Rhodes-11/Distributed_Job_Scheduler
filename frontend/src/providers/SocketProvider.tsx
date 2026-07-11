import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io as ioClient, type Socket } from 'socket.io-client';
import { BACKEND_URL } from '../lib/api';

const Ctx = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = ioClient(BACKEND_URL, {
      path: '/api/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  return <Ctx.Provider value={socket}>{children}</Ctx.Provider>;
};

export const useSocket = (): Socket | null => useContext(Ctx);
