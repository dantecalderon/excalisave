export const hashJSON = async (json: any): Promise<string> => {
  const stringified = JSON.stringify(json);
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(stringified)
  );

  return btoa(String.fromCharCode(...new Uint8Array(hash)));
};
