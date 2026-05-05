import { useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { Task } from '../types';

/**
 * Monitors tasks and sends a notification to the family feed
 * if a task is due in 1 hour and hasn't been completed.
 */
export default function TaskDeadlineMonitor() {
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.familyId) return;

    const tasksPath = `families/${profile.familyId}/tasks`;
    const tasksRef = collection(db, tasksPath);
    // Listen for unfinished tasks with deadlines
    const q = query(tasksRef, where('isCompleted', '==', false));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      snapshot.docs.forEach(async (document) => {
        const task = { id: document.id, ...document.data() } as Task;
        
        if (task.deadline && !task.deadlineNotified) {
          const deadlineDate = task.deadline.toDate();
          
          // If deadline is within the next hour (and hasn't passed more than 2 hours ago to avoid spamming very old missed tasks)
          const isWithinNextHour = deadlineDate > now && deadlineDate <= oneHourFromNow;
          
          if (isWithinNextHour) {
            try {
              // Mark as notified FIRST to prevent duplicate notifications from other concurrent users
              const taskRef = doc(db, tasksPath, task.id);
              await updateDoc(taskRef, {
                deadlineNotified: true
              });

              // Send notification to the feed
              const feedPath = `families/${profile.familyId}/posts`;
              const feedRef = collection(db, feedPath);
              
              const assigneeText = task.assignedName ? ` (assigned to ${task.assignedName})` : '';
              
              await addDoc(feedRef, {
                authorId: 'system',
                authorName: 'Family Notifier',
                authorIsHead: false,
                content: `🚨 ALERT: Task "${task.taskName}"${assigneeText} is due in less than 1 hour! Let's get it done! 💪`,
                timestamp: serverTimestamp()
              });

              console.log(`Sent deadline notification for task: ${task.taskName}`);
            } catch (error) {
              // If multiple users try at once, some might fail the updateDoc but that's okay, 
              // it means someone else already marked it or we lost permissions.
              console.error('Error sending deadline notification:', error);
            }
          }
        }
      });
    }, (err) => {
      console.error('Task monitoring permission error:', err);
      // Fail silently for background monitors to not break the app
    });

    return () => unsubscribe();
  }, [profile?.familyId]);

  return null; // This is a background worker component
}
