export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (entity: string) => new AppError(404, `${entity} no encontrado`);
export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, message, details);
export const forbidden = (message = "No tienes permisos para esta acción") =>
  new AppError(403, message);
export const unauthorized = (message = "No autenticado") => new AppError(401, message);
export const conflict = (message: string) => new AppError(409, message);
