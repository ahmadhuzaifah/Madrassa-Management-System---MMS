export type User = { id: string; name: string; email: string; role: string; settings?: Settings };
export type Settings = { theme?: 'light' | 'dark'; notificationsEnabled?: boolean; timezone?: string; language?: string };
export type Plan = { id: string; name: string; slug: string; description: string; priceMonthly: number; priceYearly: number; features: string };
export type Subscription = { id: string; plan?: Plan } | null;
export type Notification = { id: string; title: string; message: string };
export type FileRecord = { id: string; originalName: string; mimeType: string };
export type Overview = { users: number; subscriptions: number; activityLogs: number } | null;
