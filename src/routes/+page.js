// The homepage has no server-side data: no +page.server.js, no load function,
// nothing request-dependent. It was still being rendered by a serverless
// function on every cold start — measured at 2.5s TTFB cold versus 0.5s warm,
// which is the "slow on first load" everyone feels and nobody can reproduce
// twice in a row.
//
// Prerendering builds this page once at deploy time and serves it as a static
// file from the CDN, so the first visitor pays nothing. Everything under
// /api/* stays dynamic — this flag only covers this route.
//
// If this page ever needs per-request data (cookies, headers, anything the
// server must decide), delete this file: prerendered HTML is frozen at build
// time and would serve the same bytes to everyone.
export const prerender = true;
