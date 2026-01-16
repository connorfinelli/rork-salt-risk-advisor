import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

const pushTokens: Map<string, { token: string; lastRiskLevel: string | null; registeredAt: Date }> = new Map();

export const notificationsRouter = createTRPCRouter({
  registerToken: publicProcedure
    .input(z.object({
      token: z.string(),
      lastRiskLevel: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log('[Notifications] Registering push token:', input.token.substring(0, 20) + '...');
      
      pushTokens.set(input.token, {
        token: input.token,
        lastRiskLevel: input.lastRiskLevel ?? null,
        registeredAt: new Date(),
      });
      
      return { success: true, message: 'Token registered successfully' };
    }),

  unregisterToken: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .mutation(async ({ input }) => {
      console.log('[Notifications] Unregistering push token:', input.token.substring(0, 20) + '...');
      
      pushTokens.delete(input.token);
      
      return { success: true, message: 'Token unregistered successfully' };
    }),

  updateRiskLevel: publicProcedure
    .input(z.object({
      token: z.string(),
      previousRiskLevel: z.string().nullable(),
      newRiskLevel: z.string(),
    }))
    .mutation(async ({ input }) => {
      console.log('[Notifications] Risk level update:', {
        token: input.token.substring(0, 20) + '...',
        from: input.previousRiskLevel,
        to: input.newRiskLevel,
      });

      const tokenData = pushTokens.get(input.token);
      if (tokenData) {
        tokenData.lastRiskLevel = input.newRiskLevel;
      }

      if (input.previousRiskLevel && input.previousRiskLevel !== input.newRiskLevel) {
        const notificationSent = await sendPushNotification(
          input.token,
          input.previousRiskLevel,
          input.newRiskLevel
        );
        
        return { 
          success: true, 
          notificationSent,
          message: notificationSent ? 'Notification sent' : 'Risk updated but notification failed'
        };
      }

      return { success: true, notificationSent: false, message: 'Risk level updated' };
    }),
});

async function sendPushNotification(
  token: string,
  previousLevel: string,
  newLevel: string
): Promise<boolean> {
  const messages: Record<string, Record<string, string>> = {
    'AVOID': {
      'BORDERLINE': 'Road conditions improving - now Borderline',
      'SAFE': 'Roads are looking safe now',
    },
    'BORDERLINE': {
      'AVOID': 'Caution: Road treatment risk increased to Avoid',
      'SAFE': 'Roads are looking safe now',
    },
    'SAFE': {
      'BORDERLINE': 'Heads up: Road treatment risk changed to Borderline',
      'AVOID': 'Caution: Road treatment risk increased to Avoid',
    },
  };

  const title = 'Road Risk Update';
  const body = messages[previousLevel]?.[newLevel] || `Risk changed from ${previousLevel} to ${newLevel}`;

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        title,
        body,
        sound: 'default',
        data: { newRiskLevel: newLevel, previousRiskLevel: previousLevel },
      }),
    });

    const result = await response.json();
    console.log('[Notifications] Push notification result:', result);
    
    return response.ok && result.data?.status === 'ok';
  } catch (error) {
    console.error('[Notifications] Failed to send push notification:', error);
    return false;
  }
}
