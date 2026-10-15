// Pure TypeScript zip file builder (uncompressed PKZIP / Store method)
// Generates standard .zip files entirely in browser without external dependencies.

function crc32(str: string): number {
  const enc = new TextEncoder().encode(str);
  let crc = -1;
  for (let i = 0; i < enc.length; i++) {
    let byte = enc[i];
    for (let j = 0; j < 8; j++) {
      const bit = (crc ^ byte) & 1;
      crc = (crc >>> 1) ^ (bit ? 0xedb88320 : 0);
      byte >>>= 1;
    }
  }
  return (crc ^ -1) >>> 0;
}

export function createZipBlob(files: Record<string, string>): Blob {
  const enc = new TextEncoder();
  const fileEntries: {
    nameBytes: Uint8Array;
    contentBytes: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  const parts: Uint8Array[] = [];
  let offset = 0;

  // Local File Headers
  for (const [path, content] of Object.entries(files)) {
    const nameBytes = enc.encode(path);
    const contentBytes = enc.encode(content);
    const crc = crc32(content);
    const size = contentBytes.length;

    fileEntries.push({ nameBytes, contentBytes, crc, offset });

    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true);         // Version needed
    view.setUint16(6, 0, true);          // General purpose bit flag
    view.setUint16(8, 0, true);          // Compression method (0 = store)
    view.setUint16(10, 0, true);         // Last mod file time
    view.setUint16(12, 0, true);         // Last mod file date
    view.setUint32(14, crc, true);       // CRC-32
    view.setUint32(18, size, true);      // Compressed size
    view.setUint32(22, size, true);      // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // File name length
    view.setUint16(28, 0, true);          // Extra field length

    header.set(nameBytes, 30);

    parts.push(header);
    parts.push(contentBytes);

    offset += header.length + contentBytes.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;

  // Central Directory Records
  for (const entry of fileEntries) {
    const record = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(record.buffer);

    view.setUint32(0, 0x02014b50, true); // Central directory header signature
    view.setUint16(4, 20, true);         // Version made by
    view.setUint16(6, 20, true);         // Version needed
    view.setUint16(8, 0, true);          // General purpose bit flag
    view.setUint16(10, 0, true);         // Compression method (0 = store)
    view.setUint16(12, 0, true);         // Last mod file time
    view.setUint16(14, 0, true);         // Last mod file date
    view.setUint32(16, entry.crc, true); // CRC-32
    view.setUint32(20, entry.contentBytes.length, true); // Compressed size
    view.setUint32(24, entry.contentBytes.length, true); // Uncompressed size
    view.setUint16(28, entry.nameBytes.length, true); // File name length
    view.setUint16(30, 0, true);          // Extra field length
    view.setUint16(32, 0, true);          // File comment length
    view.setUint16(34, 0, true);          // Disk number start
    view.setUint16(36, 0, true);          // Internal file attributes
    view.setUint32(38, 0, true);          // External file attributes
    view.setUint32(42, entry.offset, true); // Relative offset of local header

    record.set(entry.nameBytes, 46);

    parts.push(record);
    centralDirSize += record.length;
  }

  // End of Central Directory Record
  const eocd = new Uint8Array(22);
  const view = new DataView(eocd.buffer);

  view.setUint32(0, 0x06054b50, true); // End of central dir signature
  view.setUint16(4, 0, true);          // Number of this disk
  view.setUint16(6, 0, true);          // Disk where central directory starts
  view.setUint16(8, fileEntries.length, true);  // Number of central directory records on this disk
  view.setUint16(10, fileEntries.length, true); // Total number of central directory records
  view.setUint32(12, centralDirSize, true);     // Size of central directory
  view.setUint32(16, centralDirOffset, true);   // Offset of start of central directory
  view.setUint16(20, 0, true);          // ZIP file comment length

  parts.push(eocd);

  return new Blob(parts as BlobPart[], { type: "application/zip" });
}

export function downloadZip(files: Record<string, string>, filename: string) {
  const blob = createZipBlob(files);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".zip") ? filename : `${filename}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
