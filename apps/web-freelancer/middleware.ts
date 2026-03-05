// Client-side auth check is handled in layout — middleware cannot read localStorage.
// We keep this file minimal and handle auth redirects client-side via useEffect.
export const config = { matcher: [] };
