import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFirebaseClientApp } from "./app";

export function getFirebaseClientStorage(): FirebaseStorage {
  return getStorage(getFirebaseClientApp());
}
