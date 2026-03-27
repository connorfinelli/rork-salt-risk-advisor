const REPLIT_BACKEND_URL = 'https://salt-risk.replit.app';

interface RegisterPayload {
  pushToken: string;
  latitude: number;
  longitude: number;
  locationName: string;
  state: string;
  lastRiskLevel?: string | null;
}

interface UnregisterPayload {
  pushToken: string;
}

export async function registerWithReplit(payload: RegisterPayload): Promise<boolean> {
  try {
    console.log('[Replit] Registering device:', {
      token: payload.pushToken.substring(0, 20) + '...',
      location: payload.locationName,
      state: payload.state,
    });

    const response = await fetch(`${REPLIT_BACKEND_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Replit] Registration failed:', response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log('[Replit] Registration successful:', result);
    return true;
  } catch (error) {
    console.error('[Replit] Registration error:', error);
    return false;
  }
}

export async function unregisterFromReplit(payload: UnregisterPayload): Promise<boolean> {
  try {
    console.log('[Replit] Unregistering device:', payload.pushToken.substring(0, 20) + '...');

    const response = await fetch(`${REPLIT_BACKEND_URL}/unregister`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Replit] Unregistration failed:', response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log('[Replit] Unregistration successful:', result);
    return true;
  } catch (error) {
    console.error('[Replit] Unregistration error:', error);
    return false;
  }
}

export async function updateLocationOnReplit(payload: RegisterPayload): Promise<boolean> {
  return registerWithReplit(payload);
}
