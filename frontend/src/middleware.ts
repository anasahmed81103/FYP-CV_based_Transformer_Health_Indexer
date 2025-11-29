import { NextResponse } from "next/server";

export function middleware(request: Request) {
  // Get the origin from the request headers
  const origin = request.headers.get("origin");
  console.log(`[Middleware] Request from origin: ${origin}`);

  // Define allowed origins (add your Flutter app's origin if known, or use * for dev)
  // When running 'flutter run -d chrome', the port changes, so '*' is easiest for dev.
  const allowedOrigins = ["*"]; 

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 200 });
    response.headers.set("Access-Control-Allow-Origin", origin || "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    return response;
  }

  // For other requests, proceed but we might need to add headers to the response.
  // However, Next.js middleware response modification is a bit tricky for the actual route handler response.
  // The easiest way to ensure headers are present on the response is to set them here
  // and return the response, OR let the route handler do it.
  // But for CORS, handling the OPTIONS preflight is usually the most critical part.
  
  // If we want to add headers to the *outgoing* response of the route handler, 
  // we can't easily do it in middleware unless we construct the response here.
  // But we can set headers on the request that the route handler *could* use, 
  // or we can rely on the OPTIONS handling above for the preflight, 
  // and then hope the browser accepts the actual request if the preflight passes.
  // Actually, the browser needs Access-Control-Allow-Origin on the actual response too.
  
  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", origin || "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  response.headers.set("Access-Control-Allow-Credentials", "true");

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
