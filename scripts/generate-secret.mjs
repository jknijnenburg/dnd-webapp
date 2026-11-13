// Prints a random value for SESSION_SECRET (48 random bytes, base64url).
import { randomBytes } from "node:crypto";
console.log(randomBytes(48).toString("base64url"));
