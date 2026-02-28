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
    // Special handling for MP4/M4A/M4V files - they can have different ftyp box sizes
    if (mime === 'video/mp4' || mime === 'audio/mp4' || mime === 'video/x-m4v') {
      // MP4 files: check for 'ftyp' at offset 4 (size bytes can vary: 0x18, 0x20, 0x24, etc.)
      if (buffer.length >= 8) {
        const hasFtyp = buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70; // 'ftyp'
        if (hasFtyp) {
          return true;
        }
      }
      return false;
    }
    
    // Special handling for QuickTime MOV files
    if (mime === 'video/quicktime' || mime === 'video/x-quicktime') {
      if (buffer.length >= 8) {
        // QuickTime: 'ftyp' at offset 4, or 'moov' at offset 4, or 'mdat' at offset 4
        const hasFtyp = buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70;
        const hasMoov = buffer[4] === 0x6D && buffer[5] === 0x6F && buffer[6] === 0x6F && buffer[7] === 0x76;
        const hasMdat = buffer[4] === 0x6D && buffer[5] === 0x64 && buffer[6] === 0x61 && buffer[7] === 0x74;
        if (hasFtyp || hasMoov || hasMdat) {
          return true;
        }
      }
      return false;
    }
    
    // Special handling for WebM (Matroska Video)
    if (mime === 'video/webm') {
      // WebM: starts with EBML header (0x1A 0x45 0xDF 0xA3)
      if (buffer.length >= 4) {
        const hasEbml = buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;
        if (hasEbml) {
          return true;
        }
      }
      return false;
    }
    
    // Special handling for AVI (Audio Video Interleave)
    if (mime === 'video/x-msvideo' || mime === 'video/avi') {
      // AVI: starts with 'RIFF' (0x52 0x49 0x46 0x46) followed by 'AVI '
      if (buffer.length >= 12) {
        const hasRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
        const hasAvi = buffer[8] === 0x41 && buffer[9] === 0x56 && buffer[10] === 0x49 && buffer[11] === 0x20;
        if (hasRiff && hasAvi) {
          return true;
        }
      }
      return false;
    }
    
    // Special handling for MKV/WebM (Matroska)
    if (mime === 'video/x-matroska') {
      // Matroska/MKV: starts with EBML header (0x1A 0x45 0xDF 0xA3)
      if (buffer.length >= 4) {
        const hasEbml = buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;
        if (hasEbml) {
          return true;
        }
      }
      return false;
    }
    
    // Special handling for FLV (Flash Video)
    if (mime === 'video/x-flv' || mime === 'video/flv') {
      // FLV: starts with 'FLV' (0x46 0x4C 0x56)
      if (buffer.length >= 3) {
        const hasFlv = buffer[0] === 0x46 && buffer[1] === 0x4C && buffer[2] === 0x56;
        if (hasFlv) {
          return true;
        }
      }
      return false;
    }
    
    // Special handling for 3GP (3GPP)
    if (mime === 'video/3gpp' || mime === 'video/3gpp2') {
      // 3GP: 'ftyp' at offset 4, with 3gpp, 3gp4, 3gp5, etc. brands
      if (buffer.length >= 8) {
        const hasFtyp = buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70;
        if (hasFtyp) {
          return true;
        }
      }
      return false;
    }
    
    // Special handling for MPEG video
    if (mime === 'video/mpeg' || mime === 'video/mp4') {
      // MPEG: starts with sync word 0x00 0x00 0x01 or 0x00 0x00 0x00 0x01
      if (buffer.length >= 4) {
        const isMpeg = (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01) ||
                       (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x00 && buffer[3] === 0x01);
        if (isMpeg) {
          return true;
        }
      }
      return false;
    }
    
    // Special handling for OGV (Ogg Video)
    if (mime === 'video/ogg' || mime === 'video/x-ogv') {
      // Ogg: starts with 'OggS' (0x4F 0x67 0x67 0x53)
      if (buffer.length >= 4) {
        const hasOgg = buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53;
        if (hasOgg) {
          return true;
        }
      }
      return false;
    }
    
    // Special handling for WMV/WMA (Windows Media Video/Audio)
    if (mime === 'video/x-ms-wmv' || mime === 'video/x-msvideo' || mime === 'audio/x-ms-wma') {
      // ASF: starts with 'ASF ' (0x30 0x26 0xB2 0x75)
      if (buffer.length >= 4) {
        const hasAsf = buffer[0] === 0x30 && buffer[1] === 0x26 && buffer[2] === 0xB2 && buffer[3] === 0x75;
        if (hasAsf) {
          return true;
        }
      }
      return false;
    }
    
    // Audio format signatures
    // Special handling for MP3
    if (mime === 'audio/mpeg' || mime === 'audio/mp3') {
      // MP3: starts with ID3 (0x49 0x44 0x33) or sync word (0xFF 0xFB) or (0xFF 0xF3) or (0xFF 0xF2)
      if (buffer.length >= 3) {
        const hasId3 = buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33;
        const hasSync = buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0;
        if (hasId3 || hasSync) {
          return true;
        }
      }
      return false;
    }
    
    // Special handling for Ogg Vorbis/Opus
    if (mime === 'audio/ogg' || mime === 'audio/vorbis' || mime === 'audio/opus') {
      // Ogg: starts with 'OggS' (0x4F 0x67 0x67 0x53)
      if (buffer.length >= 4) {
        const hasOgg = buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53;
        if (hasOgg) {
          return true;
        }
      }
      return false;
    }
    
    // Special handling for AAC
    if (mime === 'audio/aac' || mime === 'audio/x-aac' || mime === 'audio/mp4') {
      // AAC: ADTS header starts with 0xFF 0xF1 or 0xFF 0xF9
      if (buffer.length >= 2) {
        const hasAdts = (buffer[0] === 0xFF && (buffer[1] & 0xF0) === 0xF0);
        if (hasAdts) {
          return true;
        }
      }
      // Also check for AAC in MP4 container
      if (buffer.length >= 8) {
        const hasFtyp = buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70;
        if (hasFtyp) {
          return true;
        }
      }
      return false;
    }
    
    // Special handling for AIFF
    if (mime === 'audio/aiff' || mime === 'audio/x-aiff') {
      // AIFF: starts with 'FORM' (0x46 0x4F 0x52 0x4D) followed by 'AIFF'
      if (buffer.length >= 12) {
        const hasForm = buffer[0] === 0x46 && buffer[1] === 0x4F && buffer[2] === 0x52 && buffer[3] === 0x4D;
        const hasAiff = buffer[8] === 0x41 && buffer[9] === 0x49 && buffer[10] === 0x46 && buffer[11] === 0x46;
        if (hasForm && hasAiff) {
          return true;
        }
      }
      return false;
    }
    
    // Special handling for Opus
    if (mime === 'audio/opus') {
      // Opus in Ogg: starts with 'OggS' (0x4F 0x67 0x67 0x53)
      if (buffer.length >= 4) {
        const hasOgg = buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53;
        if (hasOgg) {
          return true;
        }
      }
      return false;
    }
    
    // Basic content validation based on MIME type magic bytes for other formats
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
