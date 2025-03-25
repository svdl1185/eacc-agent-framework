// ipfs-retrieval.js
require('dotenv').config();
const { ethers } = require('ethers');
const axios = require('axios');
const fs = require('fs');
const { createDecipheriv } = require('crypto');

async function retrieveAndDecryptIpfsContent() {
  console.log('IPFS Content Retrieval Tool');
  console.log('===========================');
  
  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log(`Using wallet address: ${wallet.address}`);
  
  // The IPFS hash we got from your previous run
  const ipfsHash = 'QmcbgeooPAVwQWkqKAf3vEi53vFyFgFi38iWNYMX9Z7DDV';
  const jobId = 505;
  const recipientAddress = '0x0F15F5B5b503410caD2A2dbf7D6aA99e05810fFB'; // Job creator address
  
  try {
    // Try to retrieve content from IPFS
    console.log(`\nAttempting to retrieve content for IPFS hash: ${ipfsHash}`);
    
    // Try multiple gateways
    const gateways = [
      'https://gateway.pinata.cloud/ipfs/',
      'https://ipfs.io/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://dweb.link/ipfs/'
    ];
    
    let content = null;
    let successGateway = null;
    
    for (const gateway of gateways) {
      try {
        const url = `${gateway}${ipfsHash}`;
        console.log(`Trying gateway: ${url}`);
        
        const response = await axios.get(url, { 
          timeout: 10000,
          responseType: 'text'
        });
        
        content = response.data;
        successGateway = gateway;
        console.log(`Successfully retrieved from ${gateway}`);
        break;
      } catch (error) {
        console.log(`Failed on ${gateway}: ${error.message}`);
      }
    }
    
    if (!content) {
      throw new Error('Failed to retrieve content from all IPFS gateways');
    }
    
    // Save raw content
    fs.writeFileSync(`ipfs_content_${ipfsHash}.raw`, content);
    console.log(`Raw content saved to ipfs_content_${ipfsHash}.raw`);
    
    // Try to detect if content is base64 encoded
    let isBase64 = false;
    try {
      const testDecode = Buffer.from(content, 'base64');
      // If it decodes without error and doesn't contain mostly unprintable characters
      const printableChars = testDecode.toString('utf8').replace(/[^\x20-\x7E]/g, '');
      isBase64 = printableChars.length / testDecode.length > 0.5;
      console.log(`Content appears to be ${isBase64 ? 'base64 encoded' : 'plaintext or binary'}`);
    } catch (e) {
      console.log('Content is not base64 encoded');
    }
    
    // If content appears to be base64 encoded, try to decrypt it
    if (isBase64) {
      console.log('\nAttempting to decrypt content...');
      
      // Try multiple session key derivation methods
      const sessionKeyMethods = [
        { 
          name: 'Standard method',
          derive: async () => {
            // Generate the standard session key
            const messageToSign = `session-key-${jobId}-${recipientAddress}`;
            const signature = await wallet.signMessage(messageToSign);
            return signature.slice(2, 66);
          }
        },
        { 
          name: 'Alternative method 1',
          derive: async () => {
            // Try a different format
            const messageToSign = `${jobId}:${recipientAddress}`;
            const signature = await wallet.signMessage(messageToSign);
            return signature.slice(2, 66);
          }
        },
        { 
          name: 'Alternative method 2',
          derive: async () => {
            // Try another variant
            const messageToSign = `${recipientAddress}-${jobId}`;
            const signature = await wallet.signMessage(messageToSign);
            return signature.slice(2, 66);
          }
        }
      ];
      
      const encryptedData = Buffer.from(content, 'base64');
      
      for (const method of sessionKeyMethods) {
        try {
          console.log(`\nTrying decryption with ${method.name}...`);
          const sessionKey = await method.derive();
          console.log(`Session key: ${sessionKey}`);
          
          const decryptedContent = decryptContent(encryptedData, sessionKey);
          console.log('Decryption successful!');
          console.log('Decrypted content:');
          console.log(decryptedContent);
          
          // Save decrypted content
          fs.writeFileSync(`decrypted_${method.name.replace(/\s+/g, '_')}.txt`, decryptedContent);
          console.log(`Decrypted content saved to decrypted_${method.name.replace(/\s+/g, '_')}.txt`);
        } catch (error) {
          console.log(`Decryption failed with ${method.name}: ${error.message}`);
        }
      }
    } else {
      console.log('\nContent does not appear to be encrypted or is in an unexpected format.');
      console.log('Content preview:');
      console.log(content.substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.error('Error during retrieval:', error);
  }
}

function decryptContent(encryptedData, key) {
  try {
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
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

retrieveAndDecryptIpfsContent().catch(console.error);