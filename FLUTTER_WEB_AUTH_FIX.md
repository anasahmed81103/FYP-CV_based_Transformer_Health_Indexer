# Fix Summary: Flutter Web Authentication Issue (401 Unauthorized)

## Problem
When running the Flutter app on **Flutter Web** (in a browser), all API requests were failing with **401 Unauthorized** errors:
- `GET /api/history` - 401 Unauthorized
- `GET /api/admin/users` - 401 Unauthorized  
- `POST /api/analyze` - 401 Unauthorized

## Root Cause

### The Cookie Header Problem
The mobile app was trying to send authentication tokens using the `Cookie` HTTP header:
```dart
headers['Cookie'] = 'token=$_authToken';
```

**However, browsers block JavaScript from setting the `Cookie` header for security reasons!**

This is a security feature called **Forbidden Header Names** in web browsers. When Flutter Web tries to set the `Cookie` header, the browser silently ignores it, so the authentication token never reaches the server.

### Why It Works on Mobile but Not Web
- **Mobile (Android/iOS)**: The `http` package has full control over HTTP headers, including `Cookie`
- **Web**: The browser's security model prevents JavaScript from setting certain headers like `Cookie`, `Host`, `Origin`, etc.

## Solution

### Changed from Cookie to Authorization Bearer Token

**Mobile App Changes (`api_service.dart`):**
```dart
// BEFORE ❌ (Doesn't work on Flutter Web)
headers['Cookie'] = 'token=$_authToken';

// AFTER ✅ (Works everywhere)
headers['Authorization'] = 'Bearer $_authToken';
```

**Backend Changes (All API Routes):**
Added a helper function to accept tokens from **both** sources:
```typescript
async function getAuthToken(req: Request): Promise<string | null> {
    // Try Authorization header first (for Flutter Web & Mobile)
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    
    // Fallback to cookie (for web browser sessions)
    const cookieStore = await cookies();
    return cookieStore.get("token")?.value || null;
}
```

This approach:
- ✅ Works with Flutter Web (Authorization header)
- ✅ Works with Flutter Mobile (Authorization header)
- ✅ Still works with regular web browsers (Cookie fallback)

## Files Modified

### Mobile App (Flutter/Dart)
1. **`mobile_app/lib/services/api_service.dart`**
   - Changed `_headers` getter to use `Authorization: Bearer <token>`
   - Updated `analyze()` method to use `Authorization` header

### Backend (Next.js/TypeScript)
All routes updated to accept both Authorization header and Cookie:

1. **`frontend/src/app/api/history/route.ts`**
2. **`frontend/src/app/api/analyze/route.ts`**
3. **`frontend/src/app/api/admin/users/route.ts`**
4. **`frontend/src/app/api/user/role/route.ts`**
5. **`frontend/src/app/api/admin/users/[id]/role/route.ts`**

## Testing Instructions

### 1. Restart Backend Server
```bash
cd C:\Users\User\OneDrive\Documents\health_Index\FYP-CV_based_Transformer_Health_Indexer\frontend
# Stop the current server (Ctrl+C)
npm run dev
```

### 2. Restart Flutter Web App
In your IDE or terminal:
- Stop the current Flutter app
- Run `flutter run -d chrome` (or use your IDE's run button)

### 3. Test Authentication Flow

#### A. Login
1. Open the app in browser
2. Click "Sign In"
3. Enter credentials and log in
4. Should redirect to dashboard ✅

#### B. Analyze
1. Fill in Transformer ID
2. Upload images
3. Click "Analyze Health Index"
4. Should see results (NOT "Unauthorized" error) ✅

#### C. History
1. Click History icon in app bar
2. Should see list of past analyses ✅

#### D. Admin (if admin user)
1. Click Admin icon in app bar
2. Should see list of users ✅

## Why This Fix Works

### Authorization Header Benefits
1. **Universal Support**: Works in all environments (web, mobile, desktop)
2. **Standard Practice**: `Authorization: Bearer <token>` is the industry standard for API authentication
3. **No Browser Restrictions**: Browsers allow JavaScript to set the `Authorization` header
4. **Better Security**: Tokens in headers are more secure than cookies for API-only authentication

### Backward Compatibility
The backend still accepts cookies, so:
- Regular web users (using the Next.js frontend) continue to work
- Flutter Web users now work with Authorization header
- Flutter Mobile users work with Authorization header

## Debug Information

### Check Browser Console
After login, you should see in the browser console:
```
Fetching history with token: <your-token>
History response status: 200
Analyzing with token: <your-token>
Analyze response status: 200
```

### Check Network Tab
In browser DevTools > Network tab, check the request headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### If Still Getting 401 Errors
1. **Clear browser cache and cookies**
2. **Log out and log in again** to get a fresh token
3. **Check the browser console** for the token value
4. **Verify backend is running** on port 3000

## Technical Background

### Forbidden Header Names
Browsers prevent JavaScript from setting these headers:
- `Accept-Charset`
- `Accept-Encoding`
- `Access-Control-*`
- `Connection`
- `Cookie` ⚠️ **This was our problem**
- `Host`
- `Origin`
- And others...

### Why Cookies Are Restricted
Cookies are automatically sent by browsers and can be set by servers. Allowing JavaScript to manually set the `Cookie` header would:
- Bypass same-origin policy
- Enable CSRF attacks
- Allow session hijacking

That's why browsers block it!

### The Authorization Header Alternative
The `Authorization` header:
- Is NOT automatically sent by browsers
- Must be explicitly set by JavaScript
- Is designed for API authentication
- Is allowed by browser security policies

## Summary

✅ **Changed authentication method from Cookie to Authorization Bearer token**  
✅ **Updated all 5 backend API routes to accept both methods**  
✅ **Updated mobile app to send Authorization header**  
✅ **Maintains backward compatibility with web browsers**  

**The 401 Unauthorized errors should now be completely resolved for Flutter Web!** 🎉
