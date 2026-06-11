const FlaskDecoder = (() => {

  function base64UrlDecode(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad === 2) base64 += '==';
    else if (pad === 3) base64 += '=';
    else if (pad === 1) throw new Error('Invalid base64 string length');
    
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  }

  async function zlibDecompress(data) {
    try {
      const ds = new DecompressionStream('deflate');
      const writer = ds.writable.getWriter();
      writer.write(data);
      writer.close();
      
      const reader = ds.readable.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return new TextDecoder().decode(result);
    } catch (e) {
      try {
        const ds = new DecompressionStream('raw');
        const writer = ds.writable.getWriter();
        writer.write(data.slice(2));
        writer.close();
        
        const reader = ds.readable.getReader();
        const chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        
        const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        
        return new TextDecoder().decode(result);
      } catch (e2) {
        throw new Error(`Decompression failed: ${e.message}`);
      }
    }
  }

  function decodeTimestamp(timestampStr) {
    try {
      const bytes = base64UrlDecode(timestampStr);
      let timestamp = 0;
      for (let i = 0; i < bytes.length; i++) {
        timestamp = (timestamp * 256) + bytes[i];
      }
      return new Date(timestamp * 1000);
    } catch {
      return null;
    }
  }

  async function decode(cookie) {
    if (!cookie || typeof cookie !== 'string') {
      throw new Error('Cookie input is empty or invalid.');
    }

    cookie = cookie.trim();

    const MAX_COOKIE_SIZE = 102400;
    if (cookie.length > MAX_COOKIE_SIZE) {
      throw new Error(`Cookie too large (${cookie.length} bytes). Maximum allowed: ${MAX_COOKIE_SIZE} bytes.`);
    }

    let isCompressed = false;
    let workingCookie = cookie;
    
    if (workingCookie.startsWith('.')) {
      isCompressed = true;
      workingCookie = workingCookie.substring(1);
    }

    const parts = workingCookie.split('.');
    
    if (parts.length < 1) {
      throw new Error('Invalid cookie format: no payload found.');
    }

    const payloadB64 = parts[0];
    const timestampB64 = parts.length >= 2 ? parts[1] : null;
    const signatureB64 = parts.length >= 3 ? parts.slice(2).join('.') : null;

    let payloadBytes;
    try {
      payloadBytes = base64UrlDecode(payloadB64);
    } catch (e) {
      throw new Error(`Failed to base64 decode payload: ${e.message}`);
    }

    let payloadStr;
    if (isCompressed) {
      try {
        payloadStr = await zlibDecompress(payloadBytes);
      } catch (e) {
        throw new Error(`Failed to decompress payload: ${e.message}`);
      }
    } else {
      payloadStr = new TextDecoder().decode(payloadBytes);
    }

    let payload;
    try {
      payload = JSON.parse(payloadStr);
    } catch (e) {
      throw new Error(`Failed to parse payload as JSON: ${e.message}\nRaw payload: ${payloadStr}`);
    }

    let timestamp = null;
    if (timestampB64) {
      timestamp = decodeTimestamp(timestampB64);
    }

    let signature = null;
    if (signatureB64) {
      signature = signatureB64;
    }

    return {
      payload,
      payloadRaw: payloadStr,
      isCompressed,
      timestamp,
      signature,
      partCount: parts.length + (isCompressed ? 0 : 0),
      payloadSize: payloadStr.length,
      keyCount: typeof payload === 'object' && payload !== null ? Object.keys(payload).length : 0,
    };
  }

  return { decode };
})();
