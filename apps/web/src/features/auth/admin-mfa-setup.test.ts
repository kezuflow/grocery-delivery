import { describe, expect, it } from "vitest";

import { parseMfaEnrollment } from "./admin-mfa-setup";

describe("administrator MFA enrollment", () => {
  it("extracts the authenticator secret and recovery codes", () => {
    expect(
      parseMfaEnrollment({
        method: "totp",
        totpURI: "otpauth://totp/Carbon:user@example.com?secret=ABC123&issuer=Carbon",
        backupCodes: ["first-code", "second-code"],
      }),
    ).toEqual({
      secret: "ABC123",
      totpUri: "otpauth://totp/Carbon:user@example.com?secret=ABC123&issuer=Carbon",
      backupCodes: ["first-code", "second-code"],
    });
  });

  it("rejects incomplete enrollment responses", () => {
    expect(parseMfaEnrollment({ method: "totp" })).toBeNull();
  });
});
