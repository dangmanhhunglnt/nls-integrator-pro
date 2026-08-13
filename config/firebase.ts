import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCehTwLl4VyXkVkwOQXWDOPwtnKCrBBXSE",
  authDomain: "nls-integrator-pro.firebaseapp.com",
  projectId: "nls-integrator-pro",
  storageBucket: "nls-integrator-pro.firebasestorage.app",
  messagingSenderId: "111974590553",
  appId: "1:111974590553:web:a21d0da9e201f774ff2948",
  measurementId: "G-60VK1C2NYB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Lỗi đăng nhập Google:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Lỗi đăng xuất:", error);
  }
};