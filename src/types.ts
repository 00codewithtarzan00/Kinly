import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  familyId: string | null;
  isHead?: boolean;
  email: string | null;
  birthday?: string;
  fcmToken?: string;
  updatedAt: Timestamp;
}

export interface Family {
  familyId: string;
  name: string;
  createdAt: Timestamp;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorIsHead?: boolean;
  content: string;
  imageUrl?: string;
  recipientId?: string | null;
  timestamp: Timestamp;
}

export interface Task {
  id: string;
  taskName: string;
  isCompleted: boolean;
  assignedId?: string;
  assignedName?: string;
  deadline?: Timestamp;
  deadlineNotified?: boolean;
  createdBy: string;
  createdByName?: string;
  completedById?: string;
  completedByName?: string;
  createdAt: Timestamp;
}

export interface VaultItem {
  id: string;
  title: string;
  value: string;
  updatedBy: string;
  updatedAt: Timestamp;
}
