// final-register.js
require('dotenv').config();
const { ethers } = require('ethers');

// ABI for MarketplaceDataV1
const MarketplaceDataV1ABI = [
  "function registerUser(bytes pubkey_, string name_, string bio_, string avatar_) external",
  "function userRegistered(address) view returns (bool)",
  "function publicKeys(address) view returns (bytes)"
];

async function getEncryptionSigningKey(wallet) {
  // The private key is used to derive the key pair
  const privateKeyBuffer = Buffer.from(wallet.privateKey.slice(2), 'hex');
  
  try {
    // In ethers v6, we need to use SigningKey to derive the public key
    console.log('Deriving public key from private key...');
    const signingKey = new ethers.SigningKey(wallet.privateKey);
    const publicKey = signingKey.publicKey;
    console.log(`Full public key: ${publicKey}`);
    
    // The publicKey from SigningKey is already in hex format with 0x prefix
    // We can use this directly or compress it if needed
    const compressedPublicKey = publicKey;
    
    console.log(`Using public key: ${compressedPublicKey}`);
    
    return {
      privateKey: privateKeyBuffer,
      compressedPublicKey
    };
  } catch (error) {
    console.error('Error deriving public key:', error);
    throw error;
  }
}

async function registerSimpleUser() {
  console.log('Final User Registration Tool');
  console.log('===========================');
  
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
    // Check if already registered
    const isRegistered = await marketplaceData.userRegistered(wallet.address);
    console.log(`\nWallet already registered: ${isRegistered}`);
    
    if (isRegistered) {
      // Get current public key
      const currentKey = await marketplaceData.publicKeys(wallet.address);
      console.log(`Currently registered public key: ${currentKey}`);
    }
    
    // Get encryption signing key
    const signingKey = await getEncryptionSigningKey(wallet);
    
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
    console.log('\n✅ User registered successfully!');
    
    // Verify registration
    const verifyRegistered = await marketplaceData.userRegistered(wallet.address);
    console.log(`\nVerification - Wallet registered: ${verifyRegistered}`);
    
    const verifyKey = await marketplaceData.publicKeys(wallet.address);
    console.log(`Verification - Registered public key: ${verifyKey}`);
    
    console.log('\nYou should now be able to decrypt messages in the EACC interface.');
  } catch (error) {
    console.error('Error registering user:', error);
  }
}

registerSimpleUser().catch(console.error);