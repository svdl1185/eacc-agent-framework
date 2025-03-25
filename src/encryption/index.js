// src/encryption/index.js
const { ethers } = require('ethers');
const { createCipheriv, createDecipheriv, randomBytes } = require('crypto');
const bs58 = require('bs58');
const multihash = require('multihashes');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../config');

/**
 * Encryption module for secure messaging on EACC
 */
class Encryption {
  /**
   * Get the encryption signing key for a wallet
   * @param {ethers.Wallet} wallet - Ethereum wallet
   * @returns {Object} - Public and private keys
   */
  async getEncryptionSigningKey(wallet) {
    // The private key is used to derive the key pair
    const privateKeyBuffer = Buffer.from(wallet.privateKey.slice(2), 'hex');
    
    try {
      // For EACC, we need to use the key that's already registered
      // We can retrieve this from the contract directly
      const MarketplaceDataV1ABI = [
        "function publicKeys(address) view returns (bytes)"
      ];
      
      const provider = wallet.provider;
      const marketplaceData = new ethers.Contract(
        process.env.MARKETPLACE_DATA_ADDRESS,
        MarketplaceDataV1ABI,
        wallet
      );
      
      // First check if the key is already in the contract
      const registeredKey = await marketplaceData.publicKeys(wallet.address);
      
      if (registeredKey && registeredKey !== '0x') {
        console.log(`Using registered public key: ${registeredKey}`);
        return {
          privateKey: privateKeyBuffer,
          compressedPublicKey: registeredKey
        };
      }
      
      // If we don't have a registered key, derive it using SigningKey
      console.log('No registered key found, deriving new key...');
      const signingKey = new ethers.SigningKey(wallet.privateKey);
      const publicKey = signingKey.publicKey;
      
      // We need to convert to compressed format for EACC
      // This is simplified - in a full implementation we'd use proper EC compression
      let compressedPublicKey;
      if (publicKey.startsWith('0x04')) {
        // This is just an example - in real code you'd properly compress the key
        // For now, we'll use a placeholder that matches the format
        compressedPublicKey = '0x03' + publicKey.slice(4, 68);
      } else {
        compressedPublicKey = publicKey;
      }
      
      console.log(`Derived compressed public key: ${compressedPublicKey}`);
      return {
        privateKey: privateKeyBuffer,
        compressedPublicKey
      };
    } catch (error) {
      console.error('Error getting encryption signing key:', error);
      throw error;
    }
  }

  /**
   * Derive a session key for secure communication
   * @param {ethers.Wallet} wallet - Ethereum wallet
   * @param {string} otherPublicKey - Public key of the other party
   * @param {string|number} jobId - Job identifier
   * @returns {string} - Session key
   */
  async getSessionKey(wallet, otherPublicKey, jobId) {
    try {
      console.log(`Generating session key for job ${jobId}`);
      console.log(`Other party's public key: ${otherPublicKey}`);
      
      // This is the standard method from your original code
      const messageToSign = `session-key-${jobId}-${otherPublicKey}`;
      console.log(`Message to sign: ${messageToSign}`);
      
      const signature = await wallet.signMessage(messageToSign);
      console.log(`Signature (abbreviated): ${signature.slice(0, 20)}...`);
      
      // Use first 32 bytes of signature as the session key
      const sessionKey = signature.slice(2, 66);
      console.log(`Generated session key (abbreviated): ${sessionKey.slice(0, 20)}...`);
      
      return sessionKey;
    } catch (error) {
      console.error('Error deriving session key:', error);
      throw error;
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param {string} data - Data to encrypt
   * @param {string} key - Encryption key (hex string)
   * @returns {Buffer} - Encrypted data
   */
  encryptUtf8Data(data, key) {
    // Key must be 32 bytes (64 hex chars)
    const keyBuffer = Buffer.from(key.slice(0, 64), 'hex');
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Format: IV (16 bytes) + AuthTag (16 bytes) + EncryptedData
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param {Buffer} encryptedData - Encrypted data
   * @param {string} key - Decryption key (hex string)
   * @returns {string} - Decrypted data as UTF-8 string
   */
  decryptToUtf8(encryptedData, key) {
    const keyBuffer = Buffer.from(key.slice(0, 64), 'hex');
    const iv = encryptedData.slice(0, 16);
    const authTag = encryptedData.slice(16, 32);
    const encrypted = encryptedData.slice(32);
    
    const decipher = createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]).toString('utf8');
  }

  /**
   * Publish data to IPFS via Pinata
   * @param {string} content - Content to publish
   * @param {string} [encryptionKey] - Optional encryption key
   * @returns {Object} - IPFS hash and other metadata
   */
  async publishToIpfs(content, encryptionKey = null) {
    let dataToUpload = content;
    
    // Encrypt if encryptionKey is provided
    if (encryptionKey) {
      console.log(`Encrypting content (${content.length} chars) with key (abbreviated): ${encryptionKey.slice(0, 10)}...`);
      dataToUpload = this.encryptUtf8Data(content, encryptionKey).toString('base64');
      console.log(`Encrypted content length: ${dataToUpload.length} chars`);
    }
    
    try {
      // For Pinata, we need to use their pinning API
      const url = `${config.ipfsApiUrl}/pinning/pinFileToIPFS`;
      
      const form = new FormData();
      
      // Add the file to the form
      form.append('file', Buffer.from(dataToUpload), {
        filename: 'data.txt',
        contentType: 'text/plain',
      });
      
      // Add metadata - FIXED: Using strings instead of boolean/objects
      const metadata = JSON.stringify({
        name: `eacc-data-${Date.now()}`,
        keyvalues: {
          encrypted: encryptionKey ? "true" : "false", // String instead of boolean
          timestamp: Date.now().toString() // String instead of number
        }
      });
      form.append('pinataMetadata', metadata);
      
      // Set request options
      const response = await axios.post(url, form, {
        maxBodyLength: Infinity, // Required for large files
        headers: {
          'Content-Type': `multipart/form-data; boundary=${form._boundary}`,
          'pinata_api_key': config.ipfsApiKey,
          'pinata_secret_api_key': config.ipfsApiSecret
        }
      });
      
      console.log('Pinata upload response:', response.data);
      
      return {
        hash: response.data.IpfsHash,
        size: response.data.PinSize,
        url: `${config.ipfsGatewayUrl}${response.data.IpfsHash}`,
        encrypted: !!encryptionKey
      };
    } catch (error) {
      console.error('Error publishing to IPFS via Pinata:', error.response?.data || error.message);
      throw new Error(`Failed to publish to IPFS: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Publish plaintext (unencrypted) data to IPFS for testing
   * @param {string} content - Content to publish
   * @returns {Object} - IPFS hash and other metadata
   */
  async publishPlaintextToIpfs(content) {
    try {
      console.log('PUBLISHING PLAINTEXT TO IPFS (FOR TESTING ONLY):');
      console.log(content);
      
      // Mark the content as a test message
      const testContent = `TEST_MESSAGE_PLAINTEXT: ${content}`;
      
      // For Pinata, we need to use their pinning API
      const url = `${config.ipfsApiUrl}/pinning/pinFileToIPFS`;
      
      const form = new FormData();
      
      // Add the file to the form
      form.append('file', Buffer.from(testContent), {
        filename: 'data.txt',
        contentType: 'text/plain',
      });
      
      // Add metadata
      const metadata = JSON.stringify({
        name: `eacc-test-${Date.now()}`,
        keyvalues: {
          encrypted: "false",
          test: "true",
          timestamp: Date.now().toString()
        }
      });
      form.append('pinataMetadata', metadata);
      
      // Set request options
      const response = await axios.post(url, form, {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${form._boundary}`,
          'pinata_api_key': config.ipfsApiKey,
          'pinata_secret_api_key': config.ipfsApiSecret
        }
      });
      
      console.log('Pinata upload response:', response.data);
      
      return {
        hash: response.data.IpfsHash,
        size: response.data.PinSize,
        url: `${config.ipfsGatewayUrl}${response.data.IpfsHash}`,
        encrypted: false
      };
    } catch (error) {
      console.error('Error publishing plaintext to IPFS via Pinata:', error.response?.data || error.message);
      throw new Error(`Failed to publish to IPFS: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Retrieve content from IPFS
   * @param {string} cid - IPFS CID
   * @param {string} [decryptionKey] - Optional decryption key
   * @returns {string} - Retrieved content
   */
  async getFromIpfs(cid, decryptionKey = null) {
    // Try each gateway in sequence until we get a successful response
    let lastError = null;
    
    for (const gateway of config.ipfsGateways) {
      try {
        const url = `${gateway}${cid}`;
        console.log(`Trying to fetch from IPFS gateway: ${url}`);
        
        const response = await axios.get(url, { 
          timeout: 10000 // 10-second timeout
        });
        
        let content = response.data;
        
        // Decrypt if decryptionKey is provided
        if (decryptionKey) {
          const encryptedData = Buffer.from(content, 'base64');
          content = this.decryptToUtf8(encryptedData, decryptionKey);
        }
        
        console.log(`Successfully retrieved content from ${gateway}`);
        return content;
      } catch (error) {
        lastError = error;
        console.log(`Failed to retrieve from ${gateway}: ${error.message}`);
        // Continue to the next gateway
      }
    }
    
    // If we've exhausted all gateways, throw an error
    throw new Error(`Failed to retrieve from all IPFS gateways: ${lastError.message}`);
  }

  /**
   * Convert a hash to IPFS CID
   * @param {string} hash - Hash in hex format
   * @returns {string} - IPFS CID
   */
  hashToCid(hash) {
    try {
      // Remove 0x prefix if present
      const cleanHash = hash.startsWith('0x') ? hash.slice(2) : hash;
      
      // If it's already a CID (starts with Qm), return it
      if (cleanHash.startsWith('Qm')) {
        return cleanHash;
      }
      
      // Convert hex to buffer
      const hashBytes = Buffer.from(cleanHash, 'hex');
      
      // Create multihash
      const multihashBytes = multihash.encode(hashBytes, 'sha2-256');
      
      // Convert to base58
      return bs58.encode(multihashBytes);
    } catch (error) {
      console.error('Error converting hash to CID:', error.message);
      throw new Error(`Failed to convert hash to CID: ${error.message}`);
    }
  }
}

// Create and export a singleton instance
const encryption = new Encryption();
module.exports = encryption;