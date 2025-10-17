/**
 * User Procedures
 * User profile and settings management
 */

import type { ProfileStyles, User, UserProfile } from "../types";

export namespace UserProcedures {
  // user.getProfile
  export namespace GetProfile {
    export interface Input {
      userId: string;
    }

    export interface Output {
      user: User;
      profile: UserProfile;
    }
  }

  // user.updateProfile
  export namespace UpdateProfile {
    export interface Input {
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
    }

    export interface Output {
      profile: UserProfile;
    }
  }

  // user.updateStyle
  export namespace UpdateStyle {
    export interface Input {
      backgroundColor?: string;
      primaryColor?: string;
      secondaryColor?: string;
      customStyles?: ProfileStyles;
    }

    export interface Output {
      profile: UserProfile;
    }
  }

  // user.updateSections
  export namespace UpdateSections {
    export interface Input {
      sections: Array<{
        id: string;
        type: string;
        content: unknown;
        order: number;
      }>;
    }

    export interface Output {
      sections: Array<{
        id: string;
        type: string;
        content: unknown;
        order: number;
      }>;
    }
  }
}
