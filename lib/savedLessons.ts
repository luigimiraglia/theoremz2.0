import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./firebase";

export async function toggleSaveLesson(uid: string, slug: string) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, { savedLessons: [slug] });
    return;
  }

  const data = snap.data();
  if (data.savedLessons?.includes(slug)) {
    await updateDoc(userRef, { savedLessons: arrayRemove(slug) });
  } else {
    await updateDoc(userRef, { savedLessons: arrayUnion(slug) });
  }
}

export async function getSavedLessons(uid: string): Promise<string[]> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data().savedLessons || [] : [];
}
