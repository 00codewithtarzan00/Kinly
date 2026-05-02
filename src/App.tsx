/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import Layout from './components/Layout';
import LoginView from './components/LoginView';

/**
 * Main application component.
 * Handles the high-level authentication state to show either the app or the login screen.
 */
function AppContent() {
  const { user, isInitialized } = useAuth();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfcf9]">
        <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-[#1a1a1a] border-t-transparent"></div>
      </div>
    );
  }

  // Bypassing login for testing - showing Layout regardless of auth state
  return <Layout />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
