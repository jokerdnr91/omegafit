export function jsonSuccess(payload, status = 200) {
  return Response.json(payload, { status });
}

export function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON payload.");
  }
}

export function mapErrorToStatus(error) {
  if (!(error instanceof Error)) {
    return 500;
  }

  const message = error.message.toLowerCase();

  if (message.includes("unauthorized")) {
    return 401;
  }

  if (message.includes("not found")) {
    return 404;
  }

  if (message.includes("required") || message.includes("invalid")) {
    return 400;
  }

  return 500;
}
