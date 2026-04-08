export class CliError extends Error {
  readonly code: string;
  readonly hint?: string;

  constructor(message: string, options?: { code?: string; hint?: string }) {
    super(message);
    this.name = "CliError";
    this.code = options?.code ?? "CLI_ERROR";
    this.hint = options?.hint;
  }
}

export function toErrorMessage(error: unknown): { message: string; hint?: string } {
  if (error instanceof CliError) {
    return { message: error.message, hint: error.hint };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: String(error) };
}
