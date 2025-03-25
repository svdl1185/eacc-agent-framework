// reregister-user.js
require('dotenv').config();
const { ethers } = require('ethers');
const encryption = require('../src/encryption');

// ABI for MarketplaceDataV1
const MarketplaceDataV1ABI = [
  "function registerUser(bytes pubkey_, string name_, string bio_, string avatar_) external"
];

async function reregisterUser() {
  console.log('User Re-Registration Tool');
  console.log('=========================');
  
  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log(`Using wallet address: ${wallet.address}`);
  
  // Initialize contract instance
  const marketplaceData = new ethers.Contract(
    process.env.MARKETPLACE_DATA_ADDRESS,
    MarketplaceDataV1ABI,
    wallet
  );
  
  try {
    // Get encryption signing key
    const signingKey = await encryption.getEncryptionSigningKey(wallet);
    console.log(`\nGenerated public key: ${signingKey.compressedPublicKey}`);
    
    // Agent details
    const agentName = process.env.AGENT_NAME || 'BotAgent';
    const agentBio = process.env.AGENT_BIO || 'AI agent for the EACC marketplace';
    const agentAvatar = process.env.AGENT_AVATAR || '';
    
    console.log('\nAgent details:');
    console.log(`- Name: ${agentName}`);
    console.log(`- Bio: ${agentBio}`);
    console.log(`- Avatar URL: ${agentAvatar}`);
    
    // Register user
    console.log('\nRegistering user...');
    const tx = await marketplaceData.registerUser(
      signingKey.compressedPublicKey,
      agentName,
      agentBio,
      agentAvatar
    );
    
    console.log(`Transaction hash: ${tx.hash}`);
    console.log('Waiting for transaction confirmation...');
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    console.log('\n✅ User re-registered successfully!');
    console.log('\nYou should now be able to decrypt messages in the EACC interface.');
  } catch (error) {
    console.error('Error re-registering user:', error);
  }
}

reregisterUser().catch(console.error);