/**
 * Settings Procedures
 * Account and privacy settings management
 */

import type { AccountSettings, PrivacySettings, UserDataExport } from "../types";

export namespace SettingsProcedures {
  // settings.getAccountSettings
  export namespace GetAccountSettings {
    export type Input = Record<string, never>;

    export interface Output {
      settings: AccountSettings;
    }
  }

  // settings.updateAccount - Consolidated account update (username, email, password)
  export namespace UpdateAccount {
    export interface Input {
      username?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    }

    export interface Output {
      success: boolean;
      user: {
        username: string;
        email: string;
      };
    }
  }

  // settings.updatePrivacy
  export namespace UpdatePrivacy {
    export interface Input {
      profileVisibility?: "public" | "private" | "followers";
      allowMessagesFrom?: "everyone" | "followers" | "friends" | "nobody";
      showFollowers?: boolean;
    }

    export interface Output {
      settings: PrivacySettings;
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

  // settings.exportData - GDPR-compliant data export
  export namespace ExportData {
    export type Input = Record<string, never>;

    export interface Output {
      data: UserDataExport;
    }
  }
}
