import { getAuth, type Auth } from "firebase/auth";
import { getFirebaseClientApp } from "./app";

export function getFirebaseClientAuth(): Auth {
  return getAuth(getFirebaseClientApp());
}
