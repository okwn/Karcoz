import type { ExtensionMessage } from '../lib/message-types';

export type RouterHandler = (
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender
) => Promise<unknown>;

interface Route {
  action: string;
  handler: RouterHandler;
}

const routes: Route[] = [];

export function registerRoute(action: string, handler: RouterHandler): void {
  routes.push({ action, handler });
}

export function unregisterRoute(action: string): void {
  const index = routes.findIndex((r) => r.action === action);
  if (index !== -1) {
    routes.splice(index, 1);
  }
}

export async function routeMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  const route = routes.find((r) => r.action === message.action);
  if (!route) {
    console.warn(`[KARÇÖZ] No handler for action: ${message.action}`);
    return { error: 'No handler found', action: message.action };
  }

  try {
    return await route.handler(message, sender);
  } catch (error) {
    console.error(`[KARÇÖZ] Handler error for ${message.action}:`, error);
    throw error;
  }
}