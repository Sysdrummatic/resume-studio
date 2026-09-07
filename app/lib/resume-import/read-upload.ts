export class UploadTooLargeError extends Error {}

/** Count the entire multipart body before parsing, including extra fields and
 * files. File.size alone is too late: formData() already buffered the upload. */
export async function readUploadFormData(request: Request, maxBytes: number): Promise<FormData> {
  if (!request.body) throw new Error("Missing upload body.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new UploadTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return new Response(Buffer.concat(chunks, size), {
    headers: { "Content-Type": request.headers.get("Content-Type") ?? "" },
  }).formData();
}
