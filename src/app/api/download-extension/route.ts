import { NextResponse } from 'next/server';
import { join } from 'path';
import archiver from 'archiver';

export async function GET() {
  try {
    const extensionPath = join(process.cwd(), 'chrome-extension');

    // Create a zip archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Convert archive to a buffer
    const chunks: Uint8Array[] = [];

    archive.on('data', (chunk: Uint8Array) => {
      chunks.push(chunk);
    });

    const archivePromise = new Promise<Uint8Array>((resolve, reject) => {
      archive.on('end', () => {
        // Concatenate all chunks into one Uint8Array
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(result);
      });
      archive.on('error', reject);
    });

    // Add all files from chrome-extension directory
    archive.directory(extensionPath, false);

    // Finalize the archive
    await archive.finalize();

    // Wait for archive to complete
    const zipBuffer = await archivePromise;

    // Return the zip file as a blob
    return new NextResponse(zipBuffer.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="clearseller-extension.zip"',
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error creating extension zip:', error);
    return NextResponse.json(
      { error: 'Failed to create extension package' },
      { status: 500 }
    );
  }
}
