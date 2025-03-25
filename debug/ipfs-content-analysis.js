// ipfs-content-analysis.js
require('dotenv').config();
const { ethers } = require('ethers');
const { createDecipheriv } = require('crypto');
const fs = require('fs');

async function analyzeIpfsContent() {
  console.log('IPFS Content Analysis Tool');
  console.log('==========================');
  
  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log(`Using wallet address: ${wallet.address}`);
  
  const ipfsHash = 'QmcbgeooPAVwQWkqKAf3vEi53vFyFgFi38iWNYMX9Z7DDV';
  const jobId = 505;
  const recipientAddress = '0x0F15F5B5b503410caD2A2dbf7D6aA99e05810fFB'; // Job creator
  
  try {
    // Read the raw content file we saved previously
    const rawFilePath = `ipfs_content_${ipfsHash}.raw`;
    
    if (!fs.existsSync(rawFilePath)) {
      console.log(`Raw file ${rawFilePath} not found. Please run ipfs-retrieval.js first.`);
      return;
    }
    
    const rawContent = fs.readFileSync(rawFilePath, 'utf8');
    console.log(`\nRead ${rawContent.length} bytes from ${rawFilePath}`);
    
    // Basic statistical analysis
    console.log('\nBasic Content Analysis:');
    analyzeContent(rawContent);
    
    // Try different encodings and analyze
    console.log('\nAttempting various decodings:');
    
    // Test if the content might be double-encoded
    let possibleEncodings = [
      { name: 'base64', decode: str => Buffer.from(str, 'base64').toString('utf8') },
      { name: 'hex', decode: str => Buffer.from(str, 'hex').toString('utf8') },
      { name: 'uri', decode: str => decodeURIComponent(str) },
    ];
    
    for (const encoding of possibleEncodings) {
      try {
        console.log(`\nTrying ${encoding.name} decoding:`);
        const decoded = encoding.decode(rawContent);
        console.log(`Decoded content (first 200 chars): ${decoded.substring(0, 200)}...`);
        
        analyzeContent(decoded);
        
        // Save the decoded content for further analysis
        fs.writeFileSync(`decoded_${encoding.name}_${ipfsHash}.txt`, decoded);
        console.log(`Saved decoded content to decoded_${encoding.name}_${ipfsHash}.txt`);
        
        // If decoded content might be base64, try further decoding
        if (isLikelyBase64(decoded)) {
          try {
            console.log(`\nAttempting secondary base64 decoding:`);
            const doubleDecoded = Buffer.from(decoded, 'base64').toString('utf8');
            console.log(`Double-decoded content (first 200 chars): ${doubleDecoded.substring(0, 200)}...`);
            
            analyzeContent(doubleDecoded);
            
            fs.writeFileSync(`double_decoded_${encoding.name}_base64_${ipfsHash}.txt`, doubleDecoded);
            console.log(`Saved double-decoded content to double_decoded_${encoding.name}_base64_${ipfsHash}.txt`);
          } catch (error) {
            console.log(`Secondary base64 decoding failed: ${error.message}`);
          }
        }
      } catch (error) {
        console.log(`${encoding.name} decoding failed: ${error.message}`);
      }
    }
    
    // Try to treat the raw content as encrypted data with different offsets
    console.log('\nAttempting various decryption approaches:');
    
    // Get the session key using the original method
    const messageToSign = `session-key-${jobId}-${recipientAddress}`;
    const signature = await wallet.signMessage(messageToSign);
    const sessionKey = signature.slice(2, 66);
    
    console.log(`Session key: ${sessionKey}`);
    
    // Convert to raw bytes to try different slicing approaches
    const rawBytes = Buffer.from(rawContent, 'utf8');
    
    // Try different IV and AuthTag offsets
    const offsets = [
      { ivStart: 0, ivLength: 16, authTagStart: 16, authTagLength: 16, description: "Standard AES-GCM format" },
      { ivStart: 0, ivLength: 12, authTagStart: 12, authTagLength: 16, description: "12-byte IV with 16-byte AuthTag" },
      { ivStart: 0, ivLength: 16, authTagStart: 16, authTagLength: 32, description: "16-byte IV with 32-byte AuthTag" },
      // If there's a prefix before the actual encrypted data
      { ivStart: 4, ivLength: 16, authTagStart: 20, authTagLength: 16, description: "4-byte prefix + Standard format" },
      { ivStart: 8, ivLength: 16, authTagStart: 24, authTagLength: 16, description: "8-byte prefix + Standard format" }
    ];
    
    for (const offset of offsets) {
      try {
        console.log(`\nTrying decryption with ${offset.description}:`);
        
        // Extract components based on offsets
        const iv = rawBytes.slice(offset.ivStart, offset.ivStart + offset.ivLength);
        const authTag = rawBytes.slice(offset.authTagStart, offset.authTagStart + offset.authTagLength);
        const encrypted = rawBytes.slice(offset.authTagStart + offset.authTagLength);
        
        console.log(`IV (${iv.length} bytes): ${iv.toString('hex').substring(0, 32)}...`);
        console.log(`AuthTag (${authTag.length} bytes): ${authTag.toString('hex').substring(0, 32)}...`);
        console.log(`Encrypted data (${encrypted.length} bytes)`);
        
        // Try decryption
        const keyBuffer = Buffer.from(sessionKey.slice(0, 64), 'hex');
        const decipher = createDecipheriv('aes-256-gcm', keyBuffer, iv);
        decipher.setAuthTag(authTag);
        
        const decrypted = Buffer.concat([
          decipher.update(encrypted),
          decipher.final()
        ]).toString('utf8');
        
        console.log('Decryption successful!');
        console.log(`Decrypted content (first 200 chars): ${decrypted.substring(0, 200)}...`);
        
        fs.writeFileSync(`decrypted_offset_${offset.ivStart}_${ipfsHash}.txt`, decrypted);
        console.log(`Saved decrypted content to decrypted_offset_${offset.ivStart}_${ipfsHash}.txt`);
      } catch (error) {
        console.log(`Decryption with ${offset.description} failed: ${error.message}`);
      }
    }
    
    // Try base64 decoding first, then decrypt
    try {
      console.log('\nTrying base64 decode + decrypt:');
      const decoded = Buffer.from(rawContent, 'base64');
      console.log(`Decoded ${decoded.length} bytes`);
      
      const iv = decoded.slice(0, 16);
      const authTag = decoded.slice(16, 32);
      const encrypted = decoded.slice(32);
      
      const keyBuffer = Buffer.from(sessionKey.slice(0, 64), 'hex');
      const decipher = createDecipheriv('aes-256-gcm', keyBuffer, iv);
      decipher.setAuthTag(authTag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]).toString('utf8');
      
      console.log('Decryption successful!');
      console.log(`Decrypted content (first 200 chars): ${decrypted.substring(0, 200)}...`);
      
      fs.writeFileSync(`decrypted_base64_${ipfsHash}.txt`, decrypted);
      console.log(`Saved decrypted content to decrypted_base64_${ipfsHash}.txt`);
    } catch (error) {
      console.log(`Base64 decode + decrypt failed: ${error.message}`);
    }
    
    console.log('\nAnalysis complete');
    
  } catch (error) {
    console.error('Error during analysis:', error);
  }
}

// Helper function to analyze content characteristics
function analyzeContent(content) {
  // Check content length
  console.log(`Length: ${content.length} characters`);
  
  // Character distribution
  const charTypes = {
    alphabetic: 0,
    numeric: 0,
    whitespace: 0,
    punctuation: 0,
    other: 0,
    unprintable: 0
  };
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const code = char.charCodeAt(0);
    
    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      charTypes.alphabetic++;
    } else if (code >= 48 && code <= 57) {
      charTypes.numeric++;
    } else if (code === 32 || code === 9 || code === 10 || code === 13) {
      charTypes.whitespace++;
    } else if (code >= 33 && code <= 126) {
      charTypes.punctuation++;
    } else if (code < 32 || code === 127) {
      charTypes.unprintable++;
    } else {
      charTypes.other++;
    }
  }
  
  console.log('Character distribution:');
  for (const [type, count] of Object.entries(charTypes)) {
    const percentage = (count / content.length * 100).toFixed(2);
    console.log(`- ${type}: ${count} (${percentage}%)`);
  }
  
  // Check if the content appears to be base64
  console.log(`Likely base64: ${isLikelyBase64(content)}`);
  
  // Check if content is valid JSON
  try {
    JSON.parse(content);
    console.log('Valid JSON: Yes');
  } catch (e) {
    console.log('Valid JSON: No');
  }
  
  // Check for common patterns
  if (content.includes('<!DOCTYPE html>') || content.includes('<html')) {
    console.log('Contains HTML markup: Yes');
  }
  
  if (content.includes('function') && content.includes('return')) {
    console.log('Contains JavaScript code: Possibly');
  }
}

// Check if a string is likely base64 encoded
function isLikelyBase64(str) {
  // Check characters are in base64 set
  const base64Pattern = /^[A-Za-z0-9+/=]+$/;
  
  // Length is multiple of 4
  const validLength = str.length % 4 === 0;
  
  // Has valid padding
  const validPadding = str.indexOf('=') === -1 || 
                     str.indexOf('=') >= str.length - 2;
  
  return base64Pattern.test(str) && validLength && validPadding;
}

analyzeIpfsContent().catch(console.error);