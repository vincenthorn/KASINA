/**
 * Types for the Kasina app
 */

export interface KasinaOption {
  id: string;
  name: string;
  description: string;
  iconPath?: string;
  requiresPremium?: boolean;
}

export interface MeditationSession {
  id?: string;
  userId?: string;
  type: string;
  kasina?: string;
  duration: number;
  startTime: Date | string;
  endTime?: Date | string;
  notes?: string;
}

export type SubscriptionTier = 'free' | 'premium';

export interface User {
  email: string;
  subscription?: SubscriptionTier;
  [key: string]: any;
}