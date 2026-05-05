import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateFamilyCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export async function getGoogleBirthday(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://people.googleapis.com/v1/people/me?personFields=birthdays', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await response.json();
    const birthday = data.birthdays?.find((b: any) => b.date);
    if (birthday && birthday.date) {
      const { year, month, day } = birthday.date;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  } catch (error) {
    console.error('Error fetching Google birthday:', error);
  }
  return null;
}

export async function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const { auth } = await import('./firebase');
  
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
