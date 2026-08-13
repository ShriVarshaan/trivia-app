import passport from "../config/passport.js";

export function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Authentication error: Token missing"));
  }

  // Format token into standard Bearer format for Passport's ExtractJwt
  const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

  // Create a minimal req object expected by passport-jwt
  const req = {
    headers: {
      authorization: authHeader,
    },
  };

  // Run Passport JWT authentication manually
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return next(
        new Error(info?.message || "Authentication error: Invalid or expired token")
      );
    }

    // Attach user returned by passport.js to the socket
    socket.user = user;
    next();
  })(req, {}, next);
}