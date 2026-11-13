/** Errors whose message is safe to show to the admin (German UI text). */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

/** The data changed since the form was rendered (optimistic concurrency). */
export class ConflictError extends UserFacingError {
  constructor(message = "Der Stand hat sich inzwischen geändert. Bitte Seite prüfen und erneut versuchen.") {
    super(message);
    this.name = "ConflictError";
  }
}

export class NotFoundError extends UserFacingError {
  constructor(message = "Der Eintrag wurde nicht gefunden.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class AuthError extends Error {
  constructor(public readonly reason: "unauthenticated" | "forbidden") {
    super(reason);
    this.name = "AuthError";
  }
}
