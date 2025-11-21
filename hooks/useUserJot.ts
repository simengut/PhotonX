import { useEffect } from 'react';

interface UserJotUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    uj: {
      identify: (user: UserJotUser) => void;
      init: (projectId: string, options: any) => void;
    };
    $ujq: any[];
  }
}

export const useUserJot = (user: { uid: string; email: string } | null) => {
  useEffect(() => {
    if (user && window.uj) {
      // Extract first and last name from email if available
      const emailName = user.email.split('@')[0];
      const nameParts = emailName.split('.');

      const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : undefined;
      const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : undefined;

      // Identify user with UserJot
      window.uj.identify({
        id: user.uid,
        email: user.email,
        firstName,
        lastName
      });
    }
  }, [user]);
};
