import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { USER_ROLES } from './roles';
import type { UserData, UserRole } from './roles';

const USERS_COLLECTION = 'users';

// Create or update user in Firestore
export async function createOrUpdateUser(
  user: User,
  role?: UserRole
): Promise<UserData> {
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  const userSnap = await getDoc(userRef);

  const now = new Date();

  if (userSnap.exists()) {
    // Update existing user
    const existingData = userSnap.data() as UserData;
    const updatedData = {
      email: user.email || existingData.email,
      displayName: user.displayName || existingData.displayName,
      photoURL: user.photoURL || existingData.photoURL,
      updatedAt: now
    };
    await updateDoc(userRef, updatedData);
    return { ...existingData, ...updatedData };
  } else {
    // Create new user with default role
    const userData: UserData = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: role || USER_ROLES.EMPLEADO, // Default role
      createdAt: now,
      updatedAt: now,
      isActive: true
    };
    await setDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return userData;
  }
}

// Get user data by UID
export async function getUserData(uid: string): Promise<UserData | null> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    return {
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date()
    } as UserData;
  }
  return null;
}

// Get all users (for superadmin panel)
export async function getAllUsers(): Promise<UserData[]> {
  const usersRef = collection(db, USERS_COLLECTION);
  const querySnapshot = await getDocs(usersRef);

  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date()
    } as UserData;
  });
}

// Get user by email
export async function getUserByEmail(email: string): Promise<UserData | null> {
  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(usersRef, where('email', '==', email));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const data = querySnapshot.docs[0].data();
    return {
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date()
    } as UserData;
  }
  return null;
}

// Update user role (superadmin only)
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, {
    role,
    updatedAt: serverTimestamp()
  });
}

// Toggle user active status
export async function toggleUserActive(uid: string, isActive: boolean): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, {
    isActive,
    updatedAt: serverTimestamp()
  });
}

// Assign role to user by email (for superadmin to add users before they sign in)
export async function assignRoleByEmail(
  email: string,
  role: UserRole
): Promise<void> {
  const user = await getUserByEmail(email);
  if (user) {
    await updateUserRole(user.uid, role);
  } else {
    // Create a placeholder user record for when they sign in
    const userRef = doc(collection(db, USERS_COLLECTION));
    await setDoc(userRef, {
      email,
      role,
      displayName: null,
      photoURL: null,
      uid: '', // Will be updated when user signs in
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true,
      isPending: true // Flag to indicate user hasn't signed in yet
    });
  }
}
