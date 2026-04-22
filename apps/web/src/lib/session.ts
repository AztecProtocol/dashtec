import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';

// Define the shape of your session data.
export interface SessionData {
  siwe?: {
    address: string;
    signature: string;
    message: string;
  },
  pkce?: {
    code_verifier: string;
    state: string;
  }
}

const sessionOptions = {
  cookieName: 'dashtec_session',
  password: process.env.SESSION_PASSWORD as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  return session;
}