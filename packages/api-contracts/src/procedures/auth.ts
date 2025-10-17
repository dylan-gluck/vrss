/**
 * Auth Procedures
 * Authentication and session management procedures
 */

import type { User } from "../types";

export namespace AuthProcedures {
  // auth.register
  export namespace Register {
    export interface Input {
      username: string;
      email: string;
      password: string;
    }

    export interface Output {
      user: User;
      sessionToken: string;
    }
  }

  // auth.login
  export namespace Login {
    export interface Input {
      email: string;
      password: string;
    }

    export interface Output {
      user: User;
      sessionToken: string;
    }
  }

  // auth.getSession
  export namespace GetSession {
    export type Input = Record<string, never>;

    export interface Output {
      user: User;
      session: {
        id: string;
        expiresAt: Date;
      };
    }
  }

  // auth.logout
  export namespace Logout {
    export type Input = Record<string, never>;

    export interface Output {
      success: boolean;
    }
  }
}
