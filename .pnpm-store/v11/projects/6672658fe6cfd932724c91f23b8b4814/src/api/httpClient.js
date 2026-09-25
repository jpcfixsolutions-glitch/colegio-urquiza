const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
let accessToken = null;
export const setAccessToken = (token) => { accessToken = token; };
export async function api(path, options = {}) {
  const headers = { "Content-Type":"application/json", ...options.headers };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let response = await fetch(`${baseUrl}${path}`, { ...options, headers, credentials:"include" });
  if (response.status === 401 && path !== "/auth/refresh") {
    const refreshed = await fetch(`${baseUrl}/auth/refresh`, { method:"POST", credentials:"include", signal:options.signal });
    if (refreshed.ok) { const data=await refreshed.json(); setAccessToken(data.accessToken); headers.Authorization=`Bearer ${data.accessToken}`; response=await fetch(`${baseUrl}${path}`,{...options,headers,credentials:"include"}); }
  }
  if (!response.ok) { const body=await response.json().catch(()=>({})); throw new Error(body.error || "No se pudo completar la operación"); }
  return response.status === 204 ? null : response.json();
}
