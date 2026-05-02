import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  familyId: string | null;
  email: string | null;
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
  content: string;
  imageUrl?: string;
  timestamp: Timestamp;
}

export interface Task {
  id: string;
  taskName: string;
  isCompleted: boolean;
  assignedTo?: string;
  createdBy: string;
  createdAt: Timestamp;
}

export interface VaultItem {
  id: string;
  title: string;
  value: string;
  updatedBy: string;
  updatedAt: Timestamp;
}
