import { Hono } from "hono";
import { authMiddleware, getAuth } from "../middleware/auth";

const authRouter = new Hono();

// Apply auth middleware to all routes
authRouter.use('/*', authMiddleware);

// GET /api/auth/validate - Validate current token
authRouter.get('/validate', async (c) => {
  const auth = getAuth(c);
  
  if (!auth.authenticated) {
    return c.json({ 
      valid: false, 
      message: 'No authentication' 
    });
  }
  
  return c.json({ 
    valid: true, 
    userId: auth.userId 
  });
});

// GET /api/auth/info - Get authenticated user info
authRouter.get('/info', async (c) => {
  const auth = getAuth(c);
  
  if (!auth.authenticated) {
    return c.json({ 
      authenticated: false,
      message: 'Not authenticated' 
    });
  }
  
  return c.json({
    authenticated: true,
    userId: auth.userId,
    label: auth.tokenLabel,
    permissions: auth.permissions,
  });
});

// GET /api/auth/permissions - Get current permissions
authRouter.get('/permissions', async (c) => {
  const auth = getAuth(c);
  
  return c.json({
    permissions: auth.permissions,
  });
});

export { authRouter };
