import ws from 'k6/ws';
import { check } from 'k6';

// TZ §8.2 — WebSocket load smoke (support chat channel)
export const options = {
  vus: 10,
  duration: '30s',
};

const WS = __ENV.WS_BASE || 'ws://localhost:4010/api/v1/ws?channel=support';

export default function () {
  const res = ws.connect(WS, {}, (socket) => {
    socket.on('open', () => {
      socket.send(JSON.stringify({ type: 'chat_message', text: 'ping' }));
    });
    socket.on('message', (data) => {
      const msg = JSON.parse(data);
      check(msg, { connected: (m) => m.type === 'connected' || m.type === 'chat_message' });
      socket.close();
    });
    socket.setTimeout(() => socket.close(), 5000);
  });
  check(res, { ws_status_101: (r) => r && r.status === 101 });
}
