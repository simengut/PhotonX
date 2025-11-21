import { SERIAL_BAUD_RATE, FRAME_HEADER, FRAME_LENGTH } from '../constants';

interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

interface SerialPort {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
}

declare global {
  interface Navigator {
    serial: {
      requestPort(options?: { filters: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<SerialPort>;
      getPorts(): Promise<SerialPort[]>;
    };
  }
}

export class SerialService {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private keepReading = false;
  private onDataCallback: ((distanceCm: number) => void) | null = null;
  private onStatusCallback: ((status: string) => void) | null = null;

  // Browser support check
  public isSupported(): boolean {
    return 'serial' in navigator;
  }

  public setOnData(callback: (distanceCm: number) => void) {
    this.onDataCallback = callback;
  }

  public setOnStatus(callback: (status: string) => void) {
    this.onStatusCallback = callback;
  }

  public async connect() {
    try {
      if (!this.isSupported()) {
        throw new Error('Web Serial API not supported in this browser.');
      }

      this.port = await navigator.serial.requestPort();
      
      await this.port.open({ 
        baudRate: SERIAL_BAUD_RATE,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });

      this.keepReading = true;
      this.readLoop();
      this.onStatusCallback?.('Connected');
    } catch (error) {
      console.error('Connection failed', error);
      this.onStatusCallback?.('Connection Failed');
      throw error;
    }
  }

  public async disconnect() {
    this.keepReading = false;
    if (this.reader) {
      await this.reader.cancel();
    }
    if (this.port) {
      await this.port.close();
    }
    this.port = null;
    this.onStatusCallback?.('Disconnected');
  }

  private async readLoop() {
    if (!this.port || !this.port.readable) return;

    this.reader = this.port.readable.getReader();
    let buffer: number[] = [];

    try {
      while (this.keepReading) {
        const { value, done } = await this.reader.read();
        if (done) {
          this.reader.releaseLock();
          break;
        }
        
        if (value) {
          // Append new bytes to buffer
          for (let i = 0; i < value.length; i++) {
            buffer.push(value[i]);
          }

          // Process buffer
          this.processBuffer(buffer);
        }
      }
    } catch (error) {
      console.error('Read error', error);
      this.onStatusCallback?.('Read Error');
    } finally {
      if (this.reader) {
        this.reader.releaseLock();
      }
    }
  }

  private processBuffer(buffer: number[]) {
    // Look for complete frames
    // Frame: [Header(5C), LowByte, HighByte, Checksum]
    
    while (buffer.length >= FRAME_LENGTH) {
      // Find header
      const headerIndex = buffer.indexOf(FRAME_HEADER);
      
      if (headerIndex === -1) {
        // No header found, keep only last few bytes just in case split header
        buffer.splice(0, buffer.length - 1); 
        return;
      }

      if (headerIndex > 0) {
        // Remove garbage before header
        buffer.splice(0, headerIndex);
      }

      // Check if we have enough bytes for a full frame
      if (buffer.length < FRAME_LENGTH) return;

      // Extract frame
      const lowByte = buffer[1];
      const highByte = buffer[2];
      const checksum = buffer[3];

      // Validate Checksum
      // Spec: "Checksum inversion (1 byte), calculated from 02 to 11"
      // Interpretation: Checksum = ~(Low + High) & 0xFF
      const sum = (lowByte + highByte) & 0xFF;
      const calculatedChecksum = (~sum) & 0xFF;

      if (checksum === calculatedChecksum) {
        // Valid Frame
        const distance = lowByte + (highByte << 8);
        
        // Filter error code (65535) if needed, or pass it through
        if (distance !== 65535 && this.onDataCallback) {
           this.onDataCallback(distance);
        }
        
        // Remove processed frame
        buffer.splice(0, FRAME_LENGTH);
      } else {
        // Invalid checksum, remove header and try again to find next sync
        // console.warn('Checksum mismatch', { expected: calculatedChecksum, got: checksum });
        buffer.splice(0, 1);
      }
    }
  }
}

// Singleton instance
export const serialService = new SerialService();