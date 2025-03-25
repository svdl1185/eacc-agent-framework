// test-plaintext-message.js
require('dotenv').config();
const { ethers } = require('ethers');
const config = require('../src/config');
const encryption = require('../src/encryption');

// Add the publishPlaintextToIpfs function from the previous snippet to your encryption module first!

// ABI imports (simplified versions)
const MarketplaceV1ABI = [
  "function postThreadMessage(uint256 jobId_, bytes32 contentHash_, address recipient) external"
];

async function sendTestMessage() {
  try {
    console.log("Test Plaintext Message Tool");
    console.log("===========================");
    
    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log(`Using wallet address: ${wallet.address}`);
    
    // Initialize contract instances
    const marketplace = new ethers.Contract(
      process.env.MARKETPLACE_ADDRESS,
      MarketplaceV1ABI,
      wallet
    );
    
    // Job ID to test
    const jobId = 505;
    // Job creator address
    const recipientAddress = '0x0F15F5B5b503410caD2A2dbf7D6aA99e05810fFB';
    
    // Test message
    const testMessage = `
This is a plaintext test message.
Time: ${new Date().toISOString()}
Job ID: ${jobId}
Recipient: ${recipientAddress}
Sender: ${wallet.address}

This message is being sent without encryption to diagnose EACC platform compatibility issues.
If you can read this message clearly, please respond back with "MESSAGE RECEIVED" to confirm.
`;
    
    // Publish test message to IPFS as plaintext
    console.log("\nPublishing plaintext test message to IPFS...");
    const { hash } = await encryption.publishPlaintextToIpfs(testMessage);
    console.log(`Published with hash: ${hash}`);
    
    // Convert hash to bytes32 format for blockchain
    const contentHashBytes = ethers.keccak256(ethers.toUtf8Bytes(hash));
    
    // Post thread message
    console.log(`\nPosting thread message for job ${jobId}...`);
    const tx = await marketplace.postThreadMessage(
      jobId, 
      contentHashBytes, 
      recipientAddress
    );
    
    const receipt = await tx.wait();
    console.log(`Transaction hash: ${receipt.hash}`);
    console.log(`Successfully sent test message for job ${jobId}`);
    
  } catch (error) {
    console.error('Error sending test message:', error);
  }
}

sendTestMessage().catch(console.error);