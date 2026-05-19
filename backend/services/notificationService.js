const pushTokens = new Map();

let socketEmitter = null;

function setSocketEmitter(emitter) {
  socketEmitter = emitter;
}

function savePushToken(token, userId) {
  if (!token) return;
  pushTokens.set(token, {
    token,
    userId,
    registeredAt: new Date()
  });
  console.log(`[Notification Service] Token registered for user: ${userId || 'anonymous'}`);
}

async function sendHeatwaveNotification(temperature, condition) {
  // Always trigger socket warning for active clients (e.g., Expo Go bypass)
  if (socketEmitter) {
    socketEmitter('heatwave_warning', { temperature, condition });
    console.log(`[Notification Service] Broadcasted socket warning: ${temperature}°C (${condition})`);
  }

  const tokens = Array.from(pushTokens.keys());
  if (tokens.length === 0) {
    console.log('[Notification Service] No push tokens registered, skipping Expo API push send');
    return;
  }

  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title: condition === 'EXTREME' ? '🚨 HEATWAVE EMERGENCY — Karachi' : '⚠️ Heat Alert — Karachi',
    body: condition === 'EXTREME' 
      ? `Danger! ${temperature}°C recorded. Stay indoors, drink cold water. Do NOT go outside.`
      : `Heat warning: ${temperature}°C. Stay hydrated. Avoid outdoor activity.`,
    data: { temperature, condition, type: 'heatwave_alert' },
    priority: 'high',
    badge: 1,
  }));

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate'
      },
      body: JSON.stringify(messages)
    });
    
    if (res.ok) {
      const result = await res.json();
      console.log('[Notification Service] Successfully sent Expo push notifications:', JSON.stringify(result));
    } else {
      const errorText = await res.text();
      console.error('[Notification Service] Expo push notification request failed:', errorText);
    }
  } catch (err) {
    console.error('[Notification Service] Error sending Expo push notifications:', err.message);
  }
}

function getTokenCount() {
  return pushTokens.size;
}

export {
  savePushToken,
  sendHeatwaveNotification,
  getTokenCount,
  setSocketEmitter
};
