import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { loginToBackend, setAuthToken } from '../lib/api';
import type { BackendUserData } from '../lib/api';
import type { UserRole } from '../lib/roles';

interface AuthContextType {
  user: User | null;
  userData: BackendUserData | null;
  userRole: UserRole | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<BackendUserData | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserData = async () => {
    if (user) {
      try {
        const idToken = await user.getIdToken();
        setAuthToken(idToken);
        const backendUser = await loginToBackend(idToken);
        setUserData(backendUser);
        setUserRole(backendUser.role);
      } catch (error) {
        console.error('Error refreshing user data from backend:', error);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        try {
          // Get Firebase ID token
          const idToken = await user.getIdToken();
          setAuthToken(idToken);

          // Call backend to get user data with role
          const backendUser = await loginToBackend(idToken);
          setUserData(backendUser);
          setUserRole(backendUser.role);
        } catch (error: any) {
          console.error('Error authenticating with backend:', error);

          // Show user-friendly error message
          if (error.message?.includes('Failed to fetch')) {
            console.error('❌ Backend is not running or CORS is not configured');
            console.error('👉 Make sure your backend is running on port 3000');
            console.error('👉 Check BACKEND_INTEGRATION.md for CORS setup');
          }

          // If backend fails, sign out user
          await signOut(auth);
          setUserData(null);
          setUserRole(null);
        }
      } else {
        setAuthToken(null);
        setUserData(null);
        setUserRole(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const value = {
    user,
    userData,
    userRole,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout,
    resetPassword,
    refreshUserData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
