// message-test.js
require('dotenv').config();
const { ethers } = require('ethers');
const axios = require('axios');
const { createDecipheriv } = require('crypto');

// ABI for MarketplaceV1
const MarketplaceV1ABI = [
  "function postThreadMessage(uint256 jobId_, bytes32 contentHash_, address recipient) external"
];

// ABI for MarketplaceDataV1
const MarketplaceDataV1ABI = [
  "function publicKeys(address) view returns (bytes)",
  "function userRegistered(address) view returns (bool)"
];

/**
 * Test sending a message and decrypting it using the registered key
 */
async function testMessageEncryption() {
  console.log('Message Encryption/Decryption Test');
  console.log('=================================');
  
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
  
  const marketplace = new ethers.Contract(
    process.env.MARKETPLACE_ADDRESS,
    MarketplaceV1ABI,
    wallet
  );
  
  try {
    // Check if wallet is registered
    const isRegistered = await marketplaceData.userRegistered(wallet.address);
    console.log(`\nWallet registered: ${isRegistered}`);
    
    if (!isRegistered) {
      console.log('⚠️ Your wallet is not registered! Please register first.');
      return;
    }
    
    // Get registered public key
    const registeredKey = await marketplaceData.publicKeys(wallet.address);
    console.log(`Registered public key: ${registeredKey}`);
    
    // Job config
    const jobId = 505;
    const recipientAddress = '0x0F15F5B5b503410caD2A2dbf7D6aA99e05810fFB'; // Job creator
    
    // Get recipient's public key for encryption
    const recipientPublicKey = await marketplaceData.publicKeys(recipientAddress);
    console.log(`\nRecipient public key: ${recipientPublicKey}`);
    
    // Generate a test message
    const testMessage = `
ENCRYPTION TEST MESSAGE
-----------------------
Time: ${new Date().toISOString()}
From: ${wallet.address}
To: ${recipientAddress}
Job ID: ${jobId}

This is a test message to diagnose decryption issues.
If you can read this message clearly in the EACC interface, please respond.
`;
    
    console.log(`\nTest message:\n${testMessage}`);
    
    // Derive session key (this is the key that should be used for encryption)
    console.log('\nDeriving session key...');
    const messageToSign = `session-key-${jobId}-${recipientPublicKey}`;
    console.log(`Message to sign: ${messageToSign}`);
    
    const signature = await wallet.signMessage(messageToSign);
    const sessionKey = signature.slice(2, 66);
    console.log(`Session key (first 10 chars): ${sessionKey.slice(0, 10)}...`);
    
    // Encrypt the message
    console.log('\nEncrypting message...');
    const encrypted = encryptMessage(testMessage, sessionKey);
    console.log(`Encrypted length: ${encrypted.length}`);
    
    // For testing, try to decrypt it immediately
    console.log('\nTesting decryption...');
    try {
      const decrypted = decryptMessage(encrypted, sessionKey);
      console.log(`Decryption test: ${decrypted === testMessage ? 'SUCCESS ✅' : 'FAILED ❌'}`);
      if (decrypted !== testMessage) {
        console.log('Original: ', testMessage.substring(0, 20));
        console.log('Decrypted:', decrypted.substring(0, 20));
      }
    } catch (error) {
      console.log(`Decryption test failed: ${error.message}`);
    }
    
    // Upload to IPFS via Pinata
    console.log('\nUploading to IPFS via Pinata...');
    const { hash, url } = await uploadToPinata(encrypted);
    console.log(`IPFS hash: ${hash}`);
    console.log(`IPFS URL: ${url}`);
    
    // Convert hash to bytes32 for the contract
    const contentHashBytes = ethers.keccak256(ethers.toUtf8Bytes(hash));
    console.log(`Content hash bytes: ${contentHashBytes}`);
    
    // Send the message
    console.log(`\nSending message to job ${jobId}...`);
    const tx = await marketplace.postThreadMessage(
      jobId,
      contentHashBytes,
      recipientAddress
    );
    
    console.log(`Transaction hash: ${tx.hash}`);
    console.log('Waiting for transaction confirmation...');
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    console.log('\n✅ Test message sent successfully!');
    console.log('Check the EACC interface to see if the message appears decrypted.');
    
  } catch (error) {
    console.error('Error in encryption test:', error);
  }
}

/**
 * Encrypt a message using AES-256-GCM
 * @param {string} message - Message to encrypt
 * @param {string} key - Encryption key (hex string)
 * @returns {string} - Base64 encoded encrypted data
 */
function encryptMessage(message, key) {
  const { createCipheriv, randomBytes } = require('crypto');
  
  // Key must be 32 bytes (64 hex chars)
  const keyBuffer = Buffer.from(key.slice(0, 64), 'hex');
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(message, 'utf8'),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // Format: IV (16 bytes) + AuthTag (16 bytes) + EncryptedData
  const result = Buffer.concat([iv, authTag, encrypted]);
  
  // Return as base64 for easy storage/transmission
  return result.toString('base64');
}

/**
 * Decrypt a message using AES-256-GCM
 * @param {string} encryptedBase64 - Base64 encoded encrypted data
 * @param {string} key - Decryption key (hex string)
 * @returns {string} - Decrypted message
 */
function decryptMessage(encryptedBase64, key) {
  const encryptedData = Buffer.from(encryptedBase64, 'base64');
  
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
 * Upload data to IPFS via Pinata
 * @param {string} data - Data to upload
 * @returns {Object} - IPFS hash and URL
 */
async function uploadToPinata(data) {
  const FormData = require('form-data');
  
  const url = `${process.env.IPFS_API_URL}/pinning/pinFileToIPFS`;
  
  const form = new FormData();
  
  // Add the file to the form
  form.append('file', Buffer.from(data), {
    filename: 'data.txt',
    contentType: 'text/plain',
  });
  
  // Add metadata
  const metadata = JSON.stringify({
    name: `eacc-test-${Date.now()}`,
    keyvalues: {
      encrypted: "true",
      test: "true",
      timestamp: Date.now().toString()
    }
  });
  form.append('pinataMetadata', metadata);
  
  // Set request options and send
  const response = await axios.post(url, form, {
    maxBodyLength: Infinity,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${form._boundary}`,
      'pinata_api_key': process.env.IPFS_API_KEY,
      'pinata_secret_api_key': process.env.IPFS_API_SECRET
    }
  });
  
  return {
    hash: response.data.IpfsHash,
    url: `${process.env.IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/'}${response.data.IpfsHash}`
  };
}

// Run the test
testMessageEncryption().catch(console.error);