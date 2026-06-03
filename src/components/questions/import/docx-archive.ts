import { deflateRawSync, inflateRawSync } from 'zlib';

interface ZipEntry {
  name: string;
  data: Buffer;
}

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosDate, dosTime };
}

export class DocxArchive {
  static read(buffer: Buffer): Map<string, Buffer> {
    const entries = new Map<string, Buffer>();
    const eocdOffset = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (eocdOffset < 0) {
      throw new Error('Invalid .docx file: ZIP directory not found');
    }

    const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
    let cursor = centralDirectoryOffset;

    for (let i = 0; i < totalEntries; i++) {
      if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
        throw new Error('Invalid .docx file: corrupt ZIP central directory');
      }

      const method = buffer.readUInt16LE(cursor + 10);
      const compressedSize = buffer.readUInt32LE(cursor + 20);
      const fileNameLength = buffer.readUInt16LE(cursor + 28);
      const extraLength = buffer.readUInt16LE(cursor + 30);
      const commentLength = buffer.readUInt16LE(cursor + 32);
      const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
      const name = buffer
        .subarray(cursor + 46, cursor + 46 + fileNameLength)
        .toString('utf8');

      const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

      if (method === 0) {
        entries.set(name, Buffer.from(compressed));
      } else if (method === 8) {
        entries.set(name, inflateRawSync(compressed));
      } else {
        throw new Error(`Unsupported .docx ZIP compression method ${method}`);
      }

      cursor += 46 + fileNameLength + extraLength + commentLength;
    }

    return entries;
  }

  static create(entries: ZipEntry[]): Buffer {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let offset = 0;
    const { dosDate, dosTime } = dosDateTime();

    for (const entry of entries) {
      const name = Buffer.from(entry.name, 'utf8');
      const compressed = deflateRawSync(entry.data);
      const checksum = crc32(entry.data);

      const local = Buffer.alloc(30 + name.length);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4);
      local.writeUInt16LE(0, 6);
      local.writeUInt16LE(8, 8);
      local.writeUInt16LE(dosTime, 10);
      local.writeUInt16LE(dosDate, 12);
      local.writeUInt32LE(checksum, 14);
      local.writeUInt32LE(compressed.length, 18);
      local.writeUInt32LE(entry.data.length, 22);
      local.writeUInt16LE(name.length, 26);
      local.writeUInt16LE(0, 28);
      name.copy(local, 30);
      localParts.push(local, compressed);

      const central = Buffer.alloc(46 + name.length);
      central.writeUInt32LE(0x02014b50, 0);
      central.writeUInt16LE(20, 4);
      central.writeUInt16LE(20, 6);
      central.writeUInt16LE(0, 8);
      central.writeUInt16LE(8, 10);
      central.writeUInt16LE(dosTime, 12);
      central.writeUInt16LE(dosDate, 14);
      central.writeUInt32LE(checksum, 16);
      central.writeUInt32LE(compressed.length, 20);
      central.writeUInt32LE(entry.data.length, 24);
      central.writeUInt16LE(name.length, 28);
      central.writeUInt16LE(0, 30);
      central.writeUInt16LE(0, 32);
      central.writeUInt16LE(0, 34);
      central.writeUInt16LE(0, 36);
      central.writeUInt32LE(0, 38);
      central.writeUInt32LE(offset, 42);
      name.copy(central, 46);
      centralParts.push(central);

      offset += local.length + compressed.length;
    }

    const centralDirectory = Buffer.concat(centralParts);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(entries.length, 8);
    eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(centralDirectory.length, 12);
    eocd.writeUInt32LE(offset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...localParts, centralDirectory, eocd]);
  }
}
