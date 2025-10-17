/**
 * Settings Procedures
 * Account and privacy settings management
 */

import type { AccountSettings, PrivacySettings } from "../types";

export namespace SettingsProcedures {
  // settings.getAccountSettings
  export namespace GetAccountSettings {
    export type Input = Record<string, never>;

    export interface Output {
      settings: AccountSettings;
    }
  }

  // settings.updateAccount
  export namespace UpdateAccount {
    export interface Input {
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      marketingEmails?: boolean;
    }

    export interface Output {
      settings: AccountSettings;
    }
  }

  // settings.getPrivacySettings
  export namespace GetPrivacySettings {
    export type Input = Record<string, never>;

    export interface Output {
      settings: PrivacySettings;
    }
  }

  // settings.updatePrivacy
  export namespace UpdatePrivacy {
    export interface Input {
      profileVisibility?: "public" | "private" | "followers_only";
      allowMessagesFrom?: "everyone" | "followers" | "friends" | "nobody";
      allowTagging?: boolean;
      showOnlineStatus?: boolean;
    }

    export interface Output {
      settings: PrivacySettings;
    }
  }

  // settings.changePassword
  export namespace ChangePassword {
    export interface Input {
      currentPassword: string;
      newPassword: string;
    }

    export interface Output {
      success: boolean;
    }
  }

  // settings.changeEmail
  export namespace ChangeEmail {
    export interface Input {
      newEmail: string;
      password: string;
    }

    export interface Output {
      success: boolean;
      verificationRequired: boolean;
    }
  }

  // settings.deleteAccount
  export namespace DeleteAccount {
    export interface Input {
      password: string;
      confirmation: string;
    }

    export interface Output {
      success: boolean;
    }
  }
}
