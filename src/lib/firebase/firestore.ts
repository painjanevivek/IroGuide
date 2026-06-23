import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseClientApp } from "./app";

export function getFirebaseClientFirestore(): Firestore {
  return getFirestore(getFirebaseClientApp());
}
