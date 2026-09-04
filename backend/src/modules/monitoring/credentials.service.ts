import { prisma } from "../../db/prisma";
import { decryptSecret, encryptSecret } from "../../utils/crypto";

export interface DecryptedCredential {
  id: string;
  label: string;
  appKey: string;
  appSecret: string;
}

/** Returns the active EZVIZ credential, decrypted for in-memory use only.
 * Never send the decrypted values back through an API response. */
export async function getActiveCredential(): Promise<DecryptedCredential | null> {
  const record = await prisma.ezvizCredential.findFirst({
    where: { active: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!record) return null;
  return {
    id: record.id,
    label: record.label,
    appKey: decryptSecret(record.appKeyCiphertext),
    appSecret: decryptSecret(record.appSecretCiphertext),
  };
}

export async function upsertCredential(label: string, appKey: string, appSecret: string) {
  await prisma.ezvizCredential.updateMany({ data: { active: false }, where: { active: true } });
  return prisma.ezvizCredential.create({
    data: {
      label,
      appKeyCiphertext: encryptSecret(appKey),
      appSecretCiphertext: encryptSecret(appSecret),
      active: true,
    },
    select: { id: true, label: true, active: true, createdAt: true },
  });
}

export async function listCredentials() {
  return prisma.ezvizCredential.findMany({
    select: { id: true, label: true, active: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });
}
