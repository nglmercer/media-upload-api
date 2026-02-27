import { fileTypeFromBuffer } from 'file-type';
import crypto from 'crypto';
import {
  type FileCategory,
  type SecurityCategory,
  type FileType,
  type ValidationFlag,
  getCategoryFromMime,
  ValidationFlag as VFlag,
} from '../types/file';
import { config } from '../config';

// ============================================================================
// Validation Result
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  detectedMime: string | null;
  detectedExtension: string | null;
  category: FileCategory | SecurityCategory;
  flags: ValidationFlag[];
  integrity: {
    sha256: string;
    size: number;
  };
}

// ============================================================================
// File Validator
// ============================================================================

export class FileValidator {
  private maxFileSize: number;
  
  constructor() {
    this.maxFileSize = config.getServer().maxFileSizeBytes;
  }
  
  async validate(file: File): Promise<ValidationResult> {
    const flags: ValidationFlag[] = [];
    const buffer = await file.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);
    const fileName = file.name || '';
    
    // Layer 1: Magic number detection
    const detected = await this.detectType(nodeBuffer);
    
    // Layer 2: Extension validation
    const clientExt = this.getExtension(fileName);
    const clientMime = file.type;
    
    if (detected.mime && clientMime && detected.mime !== clientMime) {
      flags.push(VFlag.EXTENSION_MISMATCH);
    }
    
    // Check for double extensions (suspicious)
    if (this.hasDoubleExtension(fileName)) {
      flags.push(VFlag.DOUBLE_EXTENSION);
    }
    
    // Check for known dangerous extensions
    if (this.hasDangerousExtension(fileName)) {
      flags.push(VFlag.SUSPICIOUS_EXTENSION);
    }
    
    // Layer 3: Content analysis (corruption check)
    if (detected.mime && !this.isValidContent(nodeBuffer, detected.mime)) {
      flags.push(VFlag.CORRUPTED_CONTENT);
    }
    
    // Layer 4: Integrity hash
    const sha256 = this.calculateHash(nodeBuffer);
    
    // Layer 5: Size limits
    if (nodeBuffer.length > this.maxFileSize) {
      flags.push(VFlag.OVERSIZED);
    }
    if (nodeBuffer.length === 0) {
      flags.push(VFlag.EMPTY_FILE);
    }
    
    // Check if type could not be detected
    if (!detected.mime) {
      flags.push(VFlag.UNKNOWN_TYPE);
    }
    
    // Layer 6: Category assignment
    const category = this.determineCategory(detected.mime, flags);
    
    return {
      isValid: flags.length === 0,
      detectedMime: detected.mime,
      detectedExtension: detected.ext,
      category,
      flags,
      integrity: {
        sha256,
        size: nodeBuffer.length,
      },
    };
  }
  
  private async detectType(buffer: Buffer): Promise<{
    mime: string | null;
    ext: string | null;
  }> {
    try {
      const result = await fileTypeFromBuffer(buffer);
      if (result) {
        return { mime: result.mime, ext: '.' + result.ext };
      }
    } catch {
      // Detection failed
    }
    return { mime: null, ext: null };
  }
  
  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : '';
  }
  
  private hasDoubleExtension(filename: string): boolean {
    const parts = filename.toLowerCase().split('.');
    if (parts.length < 3) return false;
    
    // Common suspicious double extensions
    const dangerous = ['exe', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'js', 'jar', 'scr', 'pif', 'msi', 'com'];
    const lastExt = parts[parts.length - 1];
    const secondLastExt = parts[parts.length - 2];
    
    return dangerous.includes(lastExt) && dangerous.includes(secondLastExt);
  }
  
  private hasDangerousExtension(filename: string): boolean {
    const dangerous = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.jar', '.scr', '.pif', '.msi', '.com', '.dll', '.sys'];
    const ext = this.getExtension(filename);
    return dangerous.includes('.' + ext);
  }
  
  private isValidContent(buffer: Buffer, mime: string): boolean {
    // Basic content validation based on MIME type magic bytes
    const signatures: Record<string, number[]> = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/gif': [0x47, 0x49, 0x46],
      'image/webp': [0x52, 0x49, 0x46, 0x46],
      'image/bmp': [0x42, 0x4D],
      'image/tiff': [0x49, 0x49, 0x2A, 0x00],
      'image/heic': [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
      'audio/wav': [0x52, 0x49, 0x46, 0x46],
      'audio/flac': [0x66, 0x4C, 0x61, 0x43],
      'audio/mp4': [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
      'video/mp4': [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
      'video/webm': [0x1A, 0x45, 0xDF, 0xA3],
      'application/pdf': [0x25, 0x50, 0x44, 0x46],
      'application/zip': [0x50, 0x4B, 0x03, 0x04],
      'application/gzip': [0x1F, 0x8B],
    };
    
    const sig = signatures[mime];
    if (sig) {
      return sig.every((b, i) => buffer[i] === b);
    }
    return true;
  }
  
  private calculateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
  
  private determineCategory(
    mime: string | null, 
    flags: ValidationFlag[]
  ): FileCategory | SecurityCategory {
    // Check for security issues first
    if (flags.includes(VFlag.CORRUPTED_CONTENT)) {
      return 'corrupted';
    }
    if (flags.includes(VFlag.EXTENSION_MISMATCH) || 
        flags.includes(VFlag.DOUBLE_EXTENSION)) {
      return 'disguised';
    }
    if (flags.includes(VFlag.UNKNOWN_TYPE)) {
      return 'unknown';
    }
    
    // Normal category from MIME
    if (mime) {
      return getCategoryFromMime(mime);
    }
    
    return 'other';
  }
}

// Export singleton instance
export const fileValidator = new FileValidator();
