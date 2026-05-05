/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import Layout from './components/Layout';
import LoginView from './components/LoginView';
import TaskDeadlineMonitor from './components/TaskDeadlineMonitor';
import BirthdayWish from './components/BirthdayWish';

/**
 * Main application component.
 * Handles the high-level authentication state to show either the app or the login screen.
 */
function AppContent() {
  const { profile, isInitialized, loading } = useAuth();

  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfcf9]">
        <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-[#1a1a1a] border-t-transparent"></div>
      </div>
    );
  }

  if (!profile) {
    return <LoginView />;
  }

  return (
    <>
      <TaskDeadlineMonitor />
      <BirthdayWish />
      <Layout />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
