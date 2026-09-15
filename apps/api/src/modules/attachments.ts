import type { Prisma } from '@estoque/database';
import { ensure } from '../core/errors';
export async function saveAttachment(
  tx: Prisma.TransactionClient,
  documentId: string,
  actorId: string,
  file?: { name: string; content: string },
) {
  if (!file) return;
  const match =
    /^data:(image\/png|image\/jpeg|image\/webp|application\/pdf);base64,([A-Za-z0-9+/=]+)$/.exec(
      file.content,
    );
  ensure(match, 400, 'Anexe uma imagem PNG, JPEG, WebP ou PDF.');
  const mime = match[1]!;
  const data = Buffer.from(match[2]!, 'base64');
  ensure(data.length <= 1_000_000, 400, 'O comprovante deve ter até 1 MB.');
  const valid =
    mime === 'application/pdf'
      ? data.subarray(0, 5).toString() === '%PDF-'
      : mime === 'image/png'
        ? data.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'
        : mime === 'image/jpeg'
          ? data.subarray(0, 3).toString('hex') === 'ffd8ff'
          : data.subarray(0, 4).toString() === 'RIFF' &&
            data.subarray(8, 12).toString() === 'WEBP';
  ensure(
    valid,
    400,
    'O conteúdo do arquivo não corresponde ao formato informado.',
  );
  return tx.attachment.create({
    data: { documentId, actorId, name: file.name, mime, data },
  });
}
