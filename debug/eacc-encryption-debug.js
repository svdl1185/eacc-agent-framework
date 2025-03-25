// eacc-encryption-debug.js
require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const bs58 = require('bs58');
const multihash = require('multihashes');

// ABI for MarketplaceDataV1
const MarketplaceDataV1ABI = [
  "function publicKeys(address) view returns (bytes)",
  "function getThreadMessages(uint256 jobId_) view returns (tuple(bytes32 contentHash, address sender, address recipient, uint32 timestamp)[])"
];

// Main diagnostic function
async function diagnoseEncryption() {
  console.log('EACC Encryption Diagnostic Tool');
  console.log('==============================');
  
  try {
    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log(`Using wallet address: ${wallet.address}`);
    
    // Initialize contract instances
    const marketplaceData = new ethers.Contract(
      process.env.MARKETPLACE_DATA_ADDRESS,
      MarketplaceDataV1ABI,
      wallet
    );
    
    // Get agent's public key from contract
    const agentPublicKey = await marketplaceData.publicKeys(wallet.address);
    
    console.log('\nAgent Public Key:');
    console.log(agentPublicKey);
    
    // Job to test
    const jobId = 505;
    console.log(`\nRetrieving messages for job #${jobId}...`);
    
    // Get thread messages
    const messages = await marketplaceData.getThreadMessages(jobId);
    console.log(`Found ${messages.length} messages`);
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      console.log(`\nMessage ${i + 1}:`);
      console.log(`- Content Hash: ${message.contentHash}`);
      console.log(`- Sender: ${message.sender}`);
      console.log(`- Recipient: ${message.recipient}`);
      console.log(`- Timestamp: ${new Date(Number(message.timestamp) * 1000).toISOString()}`);
      
      // Only attempt to decrypt messages sent by our agent
      if (message.sender.toLowerCase() === wallet.address.toLowerCase()) {
        try {
          // Convert hash to CID
          const contentCid = hashToCid(message.contentHash);
          console.log(`- IPFS CID: ${contentCid}`);
          
          // Try to fetch the content
          console.log('- Attempting to fetch content...');
          const content = await getFromIpfs(contentCid);
          console.log(`- Raw content retrieved (${content.length} bytes)`);
          
          // Try to decrypt the message using various methods
          console.log('- Attempting decryption...');
          
          // Get recipient's public key
          const recipientPublicKey = await marketplaceData.publicKeys(message.recipient);
          console.log(`- Recipient public key: ${recipientPublicKey}`);
          
          // Method 1: Standard session key
          try {
            const sessionKey = await getSessionKey(wallet, recipientPublicKey, jobId);
            console.log(`- Session key: ${sessionKey}`);
            
            const decryptedContent = decryptContent(content, sessionKey);
            console.log('\nDecrypted content (Method 1 - Standard session key):');
            console.log(decryptedContent);
          } catch (error) {
            console.log(`- Method 1 decryption failed: ${error.message}`);
          }
          
          // Method 2: Alternative session key calculation
          try {
            const altSessionKey = await getAlternativeSessionKey(wallet, recipientPublicKey, jobId);
            console.log(`- Alt session key: ${altSessionKey}`);
            
            const decryptedContent = decryptContent(content, altSessionKey);
            console.log('\nDecrypted content (Method 2 - Alternative session key):');
            console.log(decryptedContent);
          } catch (error) {
            console.log(`- Method 2 decryption failed: ${error.message}`);
          }
          
          // Save raw content for further analysis
          const fileName = `message_${jobId}_${i + 1}_raw.txt`;
          fs.writeFileSync(fileName, content);
          console.log(`- Raw content saved to ${fileName}`);
          
        } catch (error) {
          console.error(`- Error retrieving/decrypting message: ${error.message}`);
        }
      }
    }
    
    console.log('\nDiagnostic completed.');
    
  } catch (error) {
    console.error('Error during diagnostic:', error);
  }
}

// Helper functions
async function getSessionKey(wallet, otherPublicKey, jobId) {
  // Standard session key derivation (matches your current implementation)
  const messageToSign = `session-key-${jobId}-${otherPublicKey}`;
  const signature = await wallet.signMessage(messageToSign);
  return signature.slice(2, 66);
}

async function getAlternativeSessionKey(wallet, otherPublicKey, jobId) {
  // Alternative session key derivation (try a different format)
  const messageToSign = `${jobId}:${otherPublicKey}`;
  const signature = await wallet.signMessage(messageToSign);
  return signature.slice(2, 66);
}

function decryptContent(content, key) {
  try {
    // First try assuming content is base64 encoded
    const encryptedData = Buffer.from(content, 'base64');
    return decryptToUtf8(encryptedData, key);
  } catch (error) {
    // If that fails, try treating content as raw binary
    return decryptToUtf8(Buffer.from(content), key);
  }
}

function decryptToUtf8(encryptedData, key) {
  const { createDecipheriv } = require('crypto');
  
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

function hashToCid(hash) {
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
}

async function getFromIpfs(cid) {
  const gateways = [
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/'
  ];
  
  let lastError = null;
  
  for (const gateway of gateways) {
    try {
      const url = `${gateway}${cid}`;
      console.log(`  Trying gateway: ${url}`);
      
      const response = await axios.get(url, { 
        timeout: 10000,
        responseType: 'text'
      });
      
      console.log(`  Successfully retrieved from ${gateway}`);
      return response.data;
    } catch (error) {
      lastError = error;
      console.log(`  Failed on ${gateway}: ${error.message}`);
    }
  }
  
  throw new Error(`Failed to retrieve from all IPFS gateways: ${lastError.message}`);
}

// Run the diagnostic
diagnoseEncryption().catch(console.error);