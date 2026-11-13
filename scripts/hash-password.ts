/**
 * Creates a scrypt password verifier for PLAYER_PASSWORD_HASH / ADMIN_PASSWORD_HASH.
 *
 *   npm run hash-password            (interactive, input is not echoed)
 *   echo -n 'secret' | npm run --silent hash-password   (non-interactive)
 *
 * The plaintext password is never written to disk or printed.
 */
import { createInterface } from "node:readline";
import { hashPassword } from "../src/lib/auth/password";

function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(prompt);
    // Suppress echo of typed characters.
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = () => {};
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

async function main() {
  let password: string;
  if (process.stdin.isTTY) {
    password = await readHidden("Passwort: ");
    const repeat = await readHidden("Passwort wiederholen: ");
    if (password !== repeat) {
      console.error("Die Eingaben stimmen nicht überein.");
      process.exit(1);
    }
  } else {
    password = await readStdin();
  }
  if (password.length < 8) {
    console.error("Das Passwort muss mindestens 8 Zeichen lang sein (empfohlen: 12+ für Spieler, 16+ für Admin).");
    process.exit(1);
  }
  const hash = await hashPassword(password);
  if (process.stdin.isTTY) {
    console.log("\nIn .env.local bzw. in den Vercel-Umgebungsvariablen eintragen als");
    console.log("PLAYER_PASSWORD_HASH oder ADMIN_PASSWORD_HASH:\n");
  }
  console.log(hash);
}

void main();
